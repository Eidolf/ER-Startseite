import { createVarcoClient, consumerIdentityFromPrivateKey } from '@varco/client';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import crypto from 'node:crypto';
import { spawn } from 'child_process';

class VarcoWebSocket extends WebSocket {
    constructor(url, protocols, options = {}) {
        let origin = null;
        try {
            const rawUrl = String(url);
            const u = new URL(rawUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'));
            origin = u.origin;
        } catch {}

        const headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            ...(options?.headers || {})
        };
        if (origin) {
            headers['Origin'] = origin;
        }

        const customOpts = {
            ...options,
            headers
        };
        super(url, protocols, customOpts);
    }
}

globalThis.WebSocket = VarcoWebSocket;

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    globalThis.crypto = crypto.webcrypto || crypto;
}

process.on('unhandledRejection', (reason) => {
    console.warn('[Varco Worker] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Varco Worker] Uncaught Exception:', err?.message || err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.VARCO_WORKER_PORT ? parseInt(process.env.VARCO_WORKER_PORT, 10) : 8089;
const CONFIG_PATH = process.env.VARCO_CONFIG_PATH || path.join(__dirname, 'data/monitoring.json');

let client = null;
let isSubscribed = false;
let loggedFirstSync = false;
let currentSettings = null;
let currentEntities = {};
let activeEntities = [];
let syncGeneration = 0;
let syncPromise = null;
let consecutiveNoGrantFailures = 0;
let isAuthorizing = false;

console.log(`[Varco Worker] Starting Varco Consumer Sidecar on port ${PORT}...`);

function readServerSettings() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return null;
        }
        const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(content);
        if (!config.enabled) {
            return null;
        }
        const provider = (config.providers || []).find(p => p.type === 'varco' && p.enabled);
        if (!provider || !provider.settings) {
            return null;
        }
        const s = provider.settings;
        const authorityId = s.authorityId || s.authority_id;
        const shareCode = s.shareCode || s.share_code;
        const bridgeUrl = s.bridgeUrl || s.bridge_url || 'https://varco-bridge.andreabaccega.com';
        const claimSecret = s.claimSecret || s.claim_secret;
        const privateKey = s.privateKey || s.private_key;
        const identityData = s.identityData || s.identity_data;
        const consumerName = s.consumerName || s.consumer_name || 'ER-Startseite Backend Server';

        if (!authorityId || !shareCode) {
            return null;
        }

        const entityIdsFromConfig = (config.entities || []).map(e => e.id).filter(Boolean);
        const cardEntityIds = (config.cards || []).flatMap(c => c.entity_ids || c.entityIds || []).filter(Boolean);
        const requestedEntities = Array.from(new Set([
            'sensor.speedtest_download',
            'sensor.speedtest_upload',
            'sensor.speedtest_ping',
            ...entityIdsFromConfig,
            ...cardEntityIds
        ]));

        const histLimit = (typeof config.history_limit === 'number' && Number.isFinite(config.history_limit) && config.history_limit >= 5 && config.history_limit <= 100)
            ? config.history_limit
            : ((typeof config.historyLimit === 'number' && Number.isFinite(config.historyLimit) && config.historyLimit >= 5 && config.historyLimit <= 100)
                ? config.historyLimit
                : 20);

        return {
            authorityId,
            shareCode,
            bridgeUrl,
            claimSecret,
            privateKey,
            identityData,
            consumerName,
            requestedEntities,
            history_limit: histLimit
        };
    } catch (e) {
        console.error('[Varco Worker] Error reading config:', e.message);
        return null;
    }
}

const LOCK_PATH = CONFIG_PATH + '.lock';
let activeLockChild = null;

async function acquireConfigFileLock() {
    try {
        const parentDir = path.dirname(LOCK_PATH);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        // Spawn flock process and hold lock until child exits or stdin closes
        return await new Promise((resolve) => {
            const child = spawn(
                'flock',
                ['-w', '5', LOCK_PATH, 'node', '-e', 'console.log("LOCKED"); process.stdin.resume();'],
                { stdio: ['pipe', 'pipe', 'pipe'] }
            );

            let acquired = false;
            let timer = null;

            const cleanupAndFail = () => {
                if (timer) clearTimeout(timer);
                if (!acquired) {
                    try { child.kill('SIGKILL'); } catch {}
                    resolve(false);
                }
            };

            timer = setTimeout(cleanupAndFail, 6000);

            child.stdout.on('data', (data) => {
                if (data.toString().includes('LOCKED')) {
                    acquired = true;
                    if (timer) clearTimeout(timer);
                    activeLockChild = child;
                    resolve(true);
                }
            });

            child.on('error', (err) => {
                console.warn('[Varco Worker] Lock process error:', err.message || err);
                cleanupAndFail();
            });

            child.on('exit', () => {
                cleanupAndFail();
            });
        });
    } catch (err) {
        console.warn('[Varco Worker] Failed to acquire config file lock via flock:', err.message || err);
        return false;
    }
}

function releaseConfigFileLock() {
    if (activeLockChild) {
        try {
            if (activeLockChild.stdin && !activeLockChild.stdin.destroyed) {
                activeLockChild.stdin.end();
            }
            activeLockChild.kill('SIGTERM');
        } catch {}
        activeLockChild = null;
    }
}

async function savePrivateKey(privateKey, identityData = null) {
    const acquired = await acquireConfigFileLock();
    if (!acquired) {
        console.warn('[Varco Worker] Failed to acquire config file lock; skipping save.');
        return;
    }
    try {
        if (!fs.existsSync(CONFIG_PATH)) return;
        const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(content);
        const provider = (config.providers || []).find(p => p.type === 'varco');
        if (provider) {
            provider.settings = provider.settings || {};
            if (!privateKey) {
                delete provider.settings.privateKey;
                delete provider.settings.private_key;
                delete provider.settings.identityData;
                delete provider.settings.identity_data;
            } else {
                provider.settings.privateKey = privateKey;
                provider.settings.private_key = privateKey;
                if (identityData) {
                    provider.settings.identityData = identityData;
                    provider.settings.identity_data = identityData;
                }
            }
            const tmpPath = CONFIG_PATH + '.tmp';
            fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
            fs.renameSync(tmpPath, CONFIG_PATH);
            console.log('[Varco Worker] Saved identity to config file.');
            if (currentSettings) {
                if (!privateKey) {
                    delete currentSettings.privateKey;
                    delete currentSettings.identityData;
                } else {
                    currentSettings.privateKey = privateKey;
                    if (identityData) {
                        currentSettings.identityData = identityData;
                    }
                }
            }
        }
    } catch (e) {
        console.error('[Varco Worker] Error saving identity:', e.message);
    } finally {
        if (acquired) {
            releaseConfigFileLock();
        }
    }
}

async function syncVarcoClient() {
    const settings = readServerSettings();
    if (!settings) {
        if (client) {
            console.log('[Varco Worker] Config disabled or missing. Disconnecting Varco client.');
            try { client.disconnect(); } catch {}
            client = null;
        }
        syncGeneration++;
        isSubscribed = false;
        currentSettings = null;
        currentEntities = {};
        activeEntities = [];
        return;
    }

    // Check if shareCode or authorityId changed
    const shareCodeChanged = currentSettings && (
        currentSettings.shareCode !== settings.shareCode ||
        currentSettings.authorityId !== settings.authorityId
    );

    if (shareCodeChanged) {
        console.log(`[Varco Worker] Share URL changed (${currentSettings?.shareCode} -> ${settings.shareCode}). Clearing stored key for fresh pairing.`);
        await savePrivateKey(null);
        delete settings.privateKey;
        delete settings.identityData;
        currentEntities = {};
        activeEntities = [];
    }

    // Check if requested entities changed
    const currReq = currentSettings?.requestedEntities || [];
    const newReq = settings.requestedEntities || [];
    const requestedEntitiesChanged = currReq.length !== newReq.length ||
        currReq.some(e => !newReq.includes(e));

    const bridgeUrlChanged = currentSettings && currentSettings.bridgeUrl !== settings.bridgeUrl;
    const consumerNameChanged = currentSettings && currentSettings.consumerName !== settings.consumerName;

    // If already connected and subscribed, only return early if all connection and subscription settings are unchanged
    if (client && isSubscribed) {
        if (!shareCodeChanged && !requestedEntitiesChanged && !bridgeUrlChanged && !consumerNameChanged) {
            currentSettings = settings;
            return;
        }
        // One of the core attributes changed; clear isSubscribed so the rebuild path reconnects with updated settings
        isSubscribed = false;
    }

    // Compare connection endpoint and credentials to see if client needs re-instantiation
    const coreSettingsChanged = !currentSettings ||
        shareCodeChanged ||
        requestedEntitiesChanged ||
        bridgeUrlChanged ||
        consumerNameChanged;

    // If client is already created and currently waiting for user grant in Home Assistant,
    // do NOT destroy client every 10 seconds. Try to connect/reconnect on the existing client.
    if (!coreSettingsChanged && client && isAuthorizing && !isSubscribed) {
        try {
            console.log('[Varco Worker] Re-checking connection for pending grant approval...');
            await client.connect();
            console.log('[Varco Worker] Grant approved in Home Assistant! Varco Client connected.');
            isAuthorizing = false;
            consecutiveNoGrantFailures = 0;
            // Fall through to grant info & subscription below
        } catch (pollErr) {
            const pMsg = String(pollErr?.message || pollErr);
            if (pMsg.includes('Grant denied') || pMsg.includes('Grant revoked')) {
                console.warn('[Varco Worker] Grant was denied or revoked by Home Assistant. Resetting credentials and state for fresh pairing:', pMsg);
                await savePrivateKey(null);
                delete settings.privateKey;
                delete settings.identityData;
                if (client) {
                    try {
                        if (typeof client.close === 'function') await client.close();
                        else if (typeof client.disconnect === 'function') client.disconnect();
                    } catch {}
                    client = null;
                }
                isAuthorizing = false;
                consecutiveNoGrantFailures = 0;
                currentSettings = null;
                return;
            } else if (pMsg.includes('No active grant')) {
                consecutiveNoGrantFailures++;
                console.warn(`[Varco Worker] Awaiting grant approval in Home Assistant (check #${consecutiveNoGrantFailures})...`);
                if (consecutiveNoGrantFailures >= 6) {
                    console.warn('[Varco Worker] Awaiting grant timed out (no active grant after 6 checks / ~60s). Resetting credentials and client to request fresh authorization...');
                    await savePrivateKey(null);
                    delete settings.privateKey;
                    delete settings.identityData;
                    delete settings.private_key;
                    delete settings.identity_data;
                    if (client) {
                        try {
                            if (typeof client.close === 'function') await client.close();
                            else if (typeof client.disconnect === 'function') client.disconnect();
                        } catch {}
                        client = null;
                    }
                    isAuthorizing = false;
                    consecutiveNoGrantFailures = 0;
                    currentSettings = null;
                }
                return;
            } else {
                console.warn('[Varco Worker] Connection check error while awaiting grant:', pMsg);
                return;
            }
        }
    } else {
        syncGeneration++;
        currentEntities = {};
        activeEntities = [];
        if (client) {
            try {
                if (typeof client.close === 'function') {
                    client.close().catch(() => {});
                } else if (typeof client.disconnect === 'function') {
                    client.disconnect();
                }
            } catch {}
            client = null;
        }

        isSubscribed = false;
        currentSettings = settings;
        console.log(`[Varco Worker] Initializing Varco Client for Authority '${settings.authorityId}' as '${settings.consumerName}'...`);

        let storedPrivateKey = settings.privateKey || null;
        let storedIdentityData = settings.identityData || null;

        if (!storedIdentityData && storedPrivateKey) {
            let derived = null;
            if (typeof consumerIdentityFromPrivateKey === 'function') {
                try {
                    derived = consumerIdentityFromPrivateKey(storedPrivateKey);
                } catch {}
            }
            if (derived) {
                const pk = typeof derived === 'object' ? (derived.privateKey || storedPrivateKey) : storedPrivateKey;
                const pubKey = typeof derived === 'object' ? (derived.publicKey || derived.consumer_pk || pk) : pk;
                storedIdentityData = JSON.stringify({
                    privateKey: pk,
                    publicKey: pubKey,
                    consumer_pk: pubKey
                });
            } else {
                try {
                    const parsed = typeof storedPrivateKey === 'string' && storedPrivateKey.startsWith('{') ? JSON.parse(storedPrivateKey) : null;
                    const pk = parsed?.privateKey || storedPrivateKey;
                    const pubKey = parsed?.publicKey || parsed?.consumer_pk || pk;
                    storedIdentityData = JSON.stringify({
                        privateKey: pk,
                        publicKey: pubKey,
                        consumer_pk: pubKey
                    });
                } catch {
                    storedIdentityData = JSON.stringify({
                        privateKey: storedPrivateKey,
                        publicKey: storedPrivateKey,
                        consumer_pk: storedPrivateKey
                    });
                }
            }
        }

        const hadStoredPrivateKeyBeforeInit = Boolean(storedPrivateKey);
        const isNewShare = shareCodeChanged || !storedPrivateKey;

        const customStorage = {
            getItem: (k) => {
                if (k.includes('consumerIdentity') && storedIdentityData) {
                    return storedIdentityData;
                }
                return null;
            },
            setItem: (k, v) => {
                if (k.includes('consumerIdentity')) {
                    try {
                        storedIdentityData = v;
                        const parsed = JSON.parse(v);
                        if (parsed && parsed.privateKey) {
                            storedPrivateKey = parsed.privateKey;
                            savePrivateKey(parsed.privateKey, v).catch(e => {
                                console.error('[Varco Worker] Async savePrivateKey error in setItem:', e?.message || e);
                            });
                        }
                    } catch {}
                }
            },
            removeItem: () => {}
        };

        try {
            client = createVarcoClient({
                authorityId: settings.authorityId,
                bridgeUrl: settings.bridgeUrl,
                storage: customStorage,
                reconnect: true,
                manifest: {
                    name: settings.consumerName,
                    version: '1.0.0',
                    read_entities: settings.requestedEntities,
                    subscriptions: settings.requestedEntities
                }
            });

            // Attempt claimShare if this is a new share link or if we don't have a privateKey yet
            if (isNewShare && settings.claimSecret && typeof client?.claimShare === 'function') {
                try {
                    await client.claimShare(settings.shareCode, settings.claimSecret);
                    console.log('[Varco Worker] Claim share executed successfully.');
                } catch (e) {
                    console.warn('[Varco Worker] Claim share info:', e.message || e);
                }
            }

            let isConnected = false;
            try {
                if (client) {
                    await client.connect();
                    isConnected = true;
                    consecutiveNoGrantFailures = 0;
                    isAuthorizing = false;
                    console.log('[Varco Worker] Varco Client connected successfully!');
                }
            } catch (err) {
                const rawErr = err?.message != null ? err.message : err;
                const errMsg = String(rawErr);
                console.warn('[Varco Worker] Connection attempt info:', errMsg);

                const isExplicitRevocation = errMsg.includes('Grant revoked') || errMsg.includes('Grant denied');
                const isNoActiveGrant = errMsg.includes('No active grant');

                if (isExplicitRevocation && storedPrivateKey) {
                    console.warn('[Varco Worker] Stored key was revoked or denied by Home Assistant. Clearing key for fresh pairing...');
                    await savePrivateKey(null);
                    storedPrivateKey = null;
                    storedIdentityData = null;
                    delete settings.privateKey;
                    delete settings.identityData;
                    consecutiveNoGrantFailures = 0;
                }

                if (isNoActiveGrant && hadStoredPrivateKeyBeforeInit) {
                    consecutiveNoGrantFailures++;
                    console.warn(`[Varco Worker] Awaiting grant authorization in Home Assistant with existing credentials (attempt #${consecutiveNoGrantFailures}).`);
                    if (consecutiveNoGrantFailures >= 3) {
                        console.warn('[Varco Worker] Stored key has no active grant in Home Assistant after 3 connection attempts. Clearing stale credentials to prompt new pairing...');
                        await savePrivateKey(null);
                        storedPrivateKey = null;
                        storedIdentityData = null;
                        delete settings.privateKey;
                        delete settings.identityData;
                        consecutiveNoGrantFailures = 0;
                    }
                }

                const shouldRequestAccess = !hadStoredPrivateKeyBeforeInit || !storedPrivateKey || isExplicitRevocation;

                if (shouldRequestAccess && typeof client?.requestAccess === 'function') {
                    try {
                        console.log(`[Varco Worker] Requesting access permissions from Varco / Home Assistant as '${settings.consumerName}'...`);
                        const access = await client.requestAccess({
                            name: settings.consumerName,
                            version: '1.0.0',
                            read_entities: settings.requestedEntities,
                            subscriptions: settings.requestedEntities
                        });
                        const pairingCode = access?.pairing_code || access?.pairingCode || access?.code || access?.pin || 'Check Home Assistant Notifications';
                        console.log(`[Varco Worker] PAIRING REQUEST SENT TO VARCO / HOME ASSISTANT! Code: ${pairingCode}`);
                        isAuthorizing = true;
                        consecutiveNoGrantFailures = 0;

                        // Attempt connection once after requestAccess
                        if (client) {
                            try {
                                await client.connect();
                                isConnected = true;
                                isAuthorizing = false;
                                console.log('[Varco Worker] Connected immediately after requestAccess!');
                            } catch (reconnectErr) {
                                console.warn('[Varco Worker] Awaiting user authorization in Home Assistant for code:', pairingCode);
                                currentSettings = settings;
                                return;
                            }
                        }
                    } catch (pErr) {
                        console.warn('[Varco Worker] Request access info:', pErr.message || pErr);
                        currentSettings = settings;
                        return;
                    }
                } else {
                    isAuthorizing = true;
                    console.warn(`[Varco Worker] Connection not established; awaiting grant authorization in Home Assistant with existing credentials (attempt #${consecutiveNoGrantFailures}).`);
                    currentSettings = settings;
                    return;
                }
            }

            if (!isConnected || !client) {
                currentSettings = settings;
                return;
            }
        } catch (initErr) {
            const rawErr = initErr?.message != null ? initErr.message : initErr;
            const errMsg = String(rawErr);
            console.warn('[Varco Worker] Initialization/Subscription attempt failed:', errMsg);
            if (errMsg.includes('Grant revoked') || errMsg.includes('Grant denied')) {
                await savePrivateKey(null);
            }
            if (client) {
                try {
                    if (typeof client.close === 'function') await client.close();
                    else if (typeof client.disconnect === 'function') client.disconnect();
                } catch {}
                client = null;
            }
            isSubscribed = false;
            currentSettings = null;
            return;
        }
    }

    activeEntities = Array.from(new Set([...settings.requestedEntities]));
    try {
        if (typeof client?.getGrantInfo === 'function') {
            const grant = await client.getGrantInfo(true);
            const m = grant?.manifest;
            if (m) {
                const granted = Array.from(new Set([
                    ...(m.read_entities || []),
                    ...(m.subscriptions || []),
                    ...(m.entities || []),
                    ...(m.readEntities || [])
                ].filter(Boolean)));
                if (granted.length > 0) {
                    activeEntities = Array.from(new Set([...activeEntities, ...granted]));
                    console.log(`[Varco Worker] Dynamically discovered ${granted.length} unique entities from Varco share grant manifest: ${granted.join(', ')}`);
                }
            }
        }
    } catch (gErr) {
        console.warn('[Varco Worker] Dynamic grant discovery info:', gErr.message || gErr);
    }

    if (typeof client?.subscribeEntities === 'function') {
        try {
            await client.subscribeEntities(activeEntities, (event) => {
                if (event && event.states) {
                    Object.entries(event.states).forEach(([eid, entData]) => {
                        if (entData) {
                            const val = typeof entData === 'object' ? entData.state : entData;
                            const unit = typeof entData === 'object' ? entData.attributes?.unit_of_measurement : undefined;
                            const name = (typeof entData === 'object' && entData.attributes?.friendly_name) || eid.split('.').pop().replace(/_/g, ' ') || eid;
                            currentEntities[eid] = {
                                id: eid,
                                provider_id: 'varco-server-sidecar',
                                name: name,
                                domain: eid.startsWith('binary_sensor.') ? 'binary_sensor' : 'sensor',
                                value_type: typeof val === 'number' ? 'numeric' : 'string',
                                state: val ?? 'N/A',
                                unit_of_measurement: unit,
                                last_updated: new Date().toISOString()
                            };
                        }
                    });

                    if (!loggedFirstSync && Object.keys(currentEntities).length > 0) {
                        loggedFirstSync = true;
                        const hasKey = Boolean(settings.privateKey);
                        console.log(`[Varco Worker] FIRST SUCCESSFUL SYNC COMPLETED! Received ${Object.keys(currentEntities).length} entities. Credentials status: privateKey=${hasKey ? 'SAVED' : 'SAVING'}, authorityId=${settings.authorityId}. Continuous background sync ready.`);
                    }
                }
            });
            isSubscribed = true;
            isAuthorizing = false;
            consecutiveNoGrantFailures = 0;
            console.log(`[Varco Worker] Subscribed to ${activeEntities.length} entities successfully.`);
        } catch (subErr) {
            console.warn('[Varco Worker] Subscribe entities failed:', subErr?.message || subErr);
            isSubscribed = false;
        }
    }
}

async function fetchLatestStates() {
    const targetEntities = Array.from(new Set([
        ...(activeEntities.length > 0 ? activeEntities : (currentSettings?.requestedEntities || [])),
        ...Object.keys(currentEntities)
    ]));

    if (!client || !isSubscribed || typeof client.getStates !== 'function' || targetEntities.length === 0) {
        return false;
    }

    const activeClient = client;
    const activeSettings = currentSettings;
    const gen = syncGeneration;

    try {
        const states = await activeClient.getStates(targetEntities);
        if (syncGeneration !== gen || client !== activeClient || currentSettings !== activeSettings || !isSubscribed) {
            console.warn('[Varco Worker] Discarding fetched states due to client/settings generation change.');
            return false;
        }

        if (states) {
            const histLimit = (activeSettings && typeof activeSettings.history_limit === 'number') ? activeSettings.history_limit : 20;
            Object.entries(states).forEach(([eid, entData]) => {
                if (entData) {
                    const val = typeof entData === 'object' ? entData.state : entData;
                    const unit = typeof entData === 'object' ? entData.attributes?.unit_of_measurement : undefined;
                    const name = (typeof entData === 'object' && entData.attributes?.friendly_name) || eid.split('.').pop().replace(/_/g, ' ') || eid;
                    const lastUpdated = (typeof entData === 'object' && (entData.last_changed || entData.last_updated)) || new Date().toISOString();
                    const existingHist = (currentEntities[eid] && Array.isArray(currentEntities[eid].history)) ? [...currentEntities[eid].history] : [];
                    if (typeof val === 'number' && Number.isFinite(val)) {
                        if (existingHist.length === 0 || existingHist[existingHist.length - 1] !== val) {
                            existingHist.push(val);
                        }
                    } else if (typeof val === 'string' && val.trim() !== '' && val !== 'N/A' && val !== 'NaN') {
                        const num = Number(val);
                        if (typeof num === 'number' && Number.isFinite(num)) {
                            if (existingHist.length === 0 || existingHist[existingHist.length - 1] !== num) {
                                existingHist.push(num);
                            }
                        }
                    }
                    currentEntities[eid] = {
                        id: eid,
                        provider_id: 'varco-server-sidecar',
                        name: name,
                        domain: eid.startsWith('binary_sensor.') ? 'binary_sensor' : 'sensor',
                        value_type: typeof val === 'number' ? 'numeric' : 'string',
                        state: val ?? 'N/A',
                        unit_of_measurement: unit,
                        history: existingHist.slice(-histLimit),
                        last_updated: lastUpdated
                    };
                }
            });
            return true;
        }
        return false;
    } catch (err) {
        const rawErr = err?.message != null ? err.message : err;
        const errMsg = String(rawErr);
        console.warn('[Varco Worker] Active getStates query info:', errMsg);
        if (errMsg.includes('transport closed') || errMsg.includes('not connected') || errMsg.includes('closed')) {
            if (syncGeneration === gen && client === activeClient && currentSettings === activeSettings) {
                console.warn('[Varco Worker] Transport closed detected. Resetting client state for automatic reconnect...');
                isSubscribed = false;
                currentSettings = null;
                if (activeClient) {
                    try {
                        if (typeof activeClient.close === 'function') {
                            activeClient.close().catch(() => {});
                        } else if (typeof activeClient.disconnect === 'function') {
                            activeClient.disconnect();
                        }
                    } catch {}
                }
                if (client === activeClient) {
                    client = null;
                }
            }
        }
        return false;
    }
}

function runSyncVarcoClient() {
    if (!syncPromise) {
        syncPromise = syncVarcoClient().finally(() => {
            syncPromise = null;
        });
    }
    return syncPromise;
}

// Polling loop to check config updates & connection status every 10s
setInterval(() => {
    runSyncVarcoClient();
}, 10000);
runSyncVarcoClient();

// HTTP endpoint for Python backend to query current entities
const server = http.createServer(async (req, res) => {
    if (req.url === '/telemetry' && req.method === 'GET') {
        const success = await fetchLatestStates();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            online: client !== null && isSubscribed,
            success: success,
            entities: Object.values(currentEntities)
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Varco Worker] Internal HTTP telemetry server listening on 127.0.0.1:${PORT}`);
});
