import { PremiumAppManifest, FetchContext } from './types'

export const SabnzbdManifest: PremiumAppManifest = {
    id: 'sabnzbd',
    name: 'SABnzbd',
    layout: 'mixed',
    configurableFeatures: ['stats'],
    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const globalProtected = app.api_protected

        // SABnzbd API: api?mode=queue&output=json&apikey=...
        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''
        const url = `${baseUrl}/api?mode=queue&output=json&apikey=${apiKey}`

        let status = 'Idle'
        let speed = '0 B/s'

        if (globalProtected && !isAuthenticated) {
            return {
                'top': 'protected',
                'bottom': 'protected'
            }
        }

        try {
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                const q = data.queue
                status = q.status
                speed = q.speed
            }
        } catch (e) { console.error("SABnzbd fetch failed", e) }

        return {
            'top': {
                label: 'Status',
                value: status,
                icon: 'Activity',
                color: status === 'Downloading' ? 'text-green-400' : 'text-gray-400'
            },
            'bottom': {
                label: 'Speed',
                value: speed, // SABnzbd returns generic string e.g "1.2 MB/s"
                icon: 'Zap',
                color: 'text-yellow-400'
            }
        }
    }
}
