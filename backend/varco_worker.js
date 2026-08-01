import { createVarcoClient, consumerIdentityFromPrivateKey } from '@varco/client';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import crypto from 'node:crypto';

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

        return {
            authorityId,
            shareCode,
            bridgeUrl,
            claimSecret,
            privateKey,
            identityData,
            consumerName,
            requestedEntities
        };
    } catch (e) {
        console.error('[Varco Worker] Error reading config:', e.message);
        return null;
    }
}

const LOCK_PATH = CONFIG_PATH + '.lock';

async function acquireConfigFileLock() {
    const startTime = Date.now();
    while (true) {
        try {
            const fd = fs.openSync(LOCK_PATH, 'wx');
            fs.closeSync(fd);
            return true;
        } catch (err) {
            if (err.code === 'EEXIST') {
                try {
                    const stat = fs.statSync(LOCK_PATH);
                    if (Date.now() - stat.mtimeMs > 10000) {
                        try { fs.unlinkSync(LOCK_PATH); } catch {}
                    }
                } catch {}
                if (Date.now() - startTime > 5000) {
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 20));
            } else {
                return false;
            }
        }
    }
}

function releaseConfigFileLock() {
    try {
        if (fs.existsSync(LOCK_PATH)) {
            fs.unlinkSync(LOCK_PATH);
        }
    } catch {}
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
        isSubscribed = false;
        currentSettings = null;
        currentEntities = {};
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
    }

    // Check if settings changed or if client is not subscribed
    const keyChanged = JSON.stringify(settings) !== JSON.stringify(currentSettings);
    if (!keyChanged && client && isSubscribed) {
        return;
    }

    if (client) {
        try { client.disconnect(); } catch {}
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
                        setTimeout(() => {
                            savePrivateKey(parsed.privateKey, v);
                        }, 0);
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

        try {
            if (client) {
                await client.connect();
                console.log('[Varco Worker] Varco Client connected successfully!');
            }
        } catch (err) {
            console.warn('[Varco Worker] Connection attempt info:', err.message || err);
            if (!storedPrivateKey && typeof client?.requestAccess === 'function') {
                try {
                    console.log(`[Varco Worker] Requesting access permissions from Varco / Home Assistant as '${settings.consumerName}'...`);
                    const access = await client.requestAccess({
                        name: settings.consumerName,
                        version: '1.0.0',
                        read_entities: settings.requestedEntities,
                        subscriptions: settings.requestedEntities
                    });
                    console.log(`[Varco Worker] PAIRING REQUEST SENT TO VARCO / HOME ASSISTANT! Code: ${access?.pairing_code || access?.code || 'Check Home Assistant Notifications'}`);
                    if (client) await client.connect();
                } catch (pErr) {
                    console.warn('[Varco Worker] Request access info:', pErr.message || pErr);
                    throw pErr;
                }
            } else {
                throw err;
            }
        }

        if (typeof client?.subscribeEntities === 'function') {
            await client.subscribeEntities(settings.requestedEntities, (event) => {
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
                        const hasKey = Boolean(settings.privateKey || storedPrivateKey);
                        console.log(`[Varco Worker] FIRST SUCCESSFUL SYNC COMPLETED! Received ${Object.keys(currentEntities).length} entities. Credentials status: privateKey=${hasKey ? 'SAVED' : 'SAVING'}, authorityId=${settings.authorityId}. Continuous background sync ready.`);
                    }
                }
            });
            isSubscribed = true;
            console.log('[Varco Worker] Subscribed to entity updates successfully.');
        }
    } catch (initErr) {
        console.warn('[Varco Worker] Initialization/Subscription attempt failed:', initErr.message || initErr);
        if (client) {
            try { client.disconnect(); } catch {}
            client = null;
        }
        isSubscribed = false;
        currentSettings = null;
    }
}

async function fetchLatestStates() {
    if (client && isSubscribed && typeof client.getStates === 'function' && currentSettings?.requestedEntities) {
        try {
            const states = await client.getStates(currentSettings.requestedEntities);
            if (states) {
                Object.entries(states).forEach(([eid, entData]) => {
                    if (entData) {
                        const val = typeof entData === 'object' ? entData.state : entData;
                        const unit = typeof entData === 'object' ? entData.attributes?.unit_of_measurement : undefined;
                        const name = (typeof entData === 'object' && entData.attributes?.friendly_name) || eid.split('.').pop().replace(/_/g, ' ') || eid;
                        const lastUpdated = (typeof entData === 'object' && (entData.last_changed || entData.last_updated)) || new Date().toISOString();
                        currentEntities[eid] = {
                            id: eid,
                            provider_id: 'varco-server-sidecar',
                            name: name,
                            domain: eid.startsWith('binary_sensor.') ? 'binary_sensor' : 'sensor',
                            value_type: typeof val === 'number' ? 'numeric' : 'string',
                            state: val ?? 'N/A',
                            unit_of_measurement: unit,
                            last_updated: lastUpdated
                        };
                    }
                });
            }
        } catch (err) {
            console.warn('[Varco Worker] Active getStates query info:', err?.message || err);
        }
    }
}

// Polling loop to check config updates & connection status every 10s
setInterval(async () => {
    await syncVarcoClient();
}, 10000);
syncVarcoClient();

// HTTP endpoint for Python backend to query current entities
const server = http.createServer(async (req, res) => {
    if (req.url === '/telemetry' && req.method === 'GET') {
        await fetchLatestStates();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            online: client !== null && isSubscribed,
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
