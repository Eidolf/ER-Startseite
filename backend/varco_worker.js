import { createVarcoClient } from '@varco/client';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
    globalThis.WebSocket = WebSocket;
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
        const consumerName = s.consumerName || s.consumer_name || 'ER-Startseite Backend Server';

        if (!authorityId || !shareCode) {
            return null;
        }

        return {
            authorityId,
            shareCode,
            bridgeUrl,
            claimSecret,
            privateKey,
            consumerName
        };
    } catch (e) {
        console.error('[Varco Worker] Error reading config:', e.message);
        return null;
    }
}

function savePrivateKey(privateKey) {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return;
        const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(content);
        const provider = (config.providers || []).find(p => p.type === 'varco');
        if (provider) {
            provider.settings = provider.settings || {};
            provider.settings.privateKey = privateKey;
            provider.settings.private_key = privateKey;
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
            console.log('[Varco Worker] Saved privateKey to config file.');
        }
    } catch (e) {
        console.error('[Varco Worker] Error saving privateKey:', e.message);
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
        currentSettings = null;
        currentEntities = {};
        return;
    }

    // Check if settings changed
    const keyChanged = JSON.stringify(settings) !== JSON.stringify(currentSettings);
    if (!keyChanged && client) {
        return;
    }

    if (client) {
        try { client.disconnect(); } catch {}
        client = null;
    }

    currentSettings = settings;
    console.log(`[Varco Worker] Initializing Varco Client for Authority '${settings.authorityId}' as '${settings.consumerName}'...`);

    let storedPrivateKey = settings.privateKey || null;

    const customStorage = {
        getItem: (k) => {
            if (k.includes('consumerIdentity') && storedPrivateKey) {
                return JSON.stringify({ privateKey: storedPrivateKey });
            }
            return null;
        },
        setItem: (k, v) => {
            if (k.includes('consumerIdentity')) {
                try {
                    const parsed = JSON.parse(v);
                    if (parsed && parsed.privateKey) {
                        storedPrivateKey = parsed.privateKey;
                        savePrivateKey(parsed.privateKey);
                    }
                } catch {}
            }
        },
        removeItem: () => {}
    };

    client = createVarcoClient({
        authorityId: settings.authorityId,
        bridgeUrl: settings.bridgeUrl,
        storage: customStorage,
        manifest: {
            name: settings.consumerName,
            version: '1.0.0',
            read_entities: ['*'],
            subscriptions: ['*']
        }
    });

    if (settings.claimSecret && typeof client.claimShare === 'function') {
        try {
            await client.claimShare(settings.shareCode, settings.claimSecret);
            console.log('[Varco Worker] Claim share executed.');
        } catch (e) {
            console.warn('[Varco Worker] Claim share info:', e.message);
        }
    }

    try {
        await client.connect();
        console.log('[Varco Worker] Varco Client connected successfully!');
    } catch (err) {
        console.warn('[Varco Worker] Connection attempt info:', err.message || err);
        if (typeof client.requestAccess === 'function') {
            try {
                const access = await client.requestAccess({
                    name: settings.consumerName,
                    version: '1.0.0',
                    read_entities: ['*'],
                    subscriptions: ['*']
                });
                console.log(`[Varco Worker] ACCESS REQUEST PAIRING CODE: ${access?.pairing_code || access?.code || 'CHECK HOME ASSISTANT'}`);
                await client.connect();
            } catch (pErr) {
                console.warn('[Varco Worker] Request access info:', pErr.message || pErr);
            }
        }
    }

    if (typeof client.subscribeEntities === 'function') {
        try {
            await client.subscribeEntities(['*'], (event) => {
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
                }
            });
            console.log('[Varco Worker] Subscribed to entity updates.');
        } catch (subErr) {
            console.warn('[Varco Worker] Subscribe entities info:', subErr.message);
        }
    }
}

// Polling loop to check config updates every 10s
setInterval(syncVarcoClient, 10000);
syncVarcoClient();

// HTTP endpoint for Python backend to query current entities
const server = http.createServer((req, res) => {
    if (req.url === '/telemetry' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            online: client !== null,
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
