// Service Worker Background Telemetry Sync Relay
const CACHE_NAME = 'er-startseite-sw-v1'

self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

// Listen for telemetry sync events posted from Varco client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'VARCO_TELEMETRY_SYNC') {
        const payload = event.data.payload
        if (payload && payload.entities) {
            fetch('/api/v1/monitoring/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entities: payload.entities }),
            }).catch(() => {})
        }
    }
})
