import { PremiumAppManifest, FetchContext } from './types'

export const LidarrManifest: PremiumAppManifest = {
    id: 'lidarr',
    name: 'Lidarr',
    layout: 'mixed', // 2 small top, 1 big bottom? Or we define 'mixed' as 1 big left/right? 
    configurableFeatures: ['queue', 'stats'],
    // Let's assume 'mixed' = 2 small (top-left, top-right) and 1 big or 2 more small?
    // Actually current Lidarr has "Queue" and "Albums". 2 items.
    // Let's use 'grid-4' but only populate 2, or flexible.
    // Current UI: 2 items vertically stacked? No, "flex flex-col gap-2".
    // Wait, the existing UI for Lidarr:
    // <div className="flex flex-col gap-2 p-2 w-full h-full justify-center">
    //    Row 1: Queue
    //    Row 2: Albums
    // </div>
    // This looks like 'rows-2'.

    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const config = app.api_config || {}
        const showStats = config.stats?.enabled ?? true
        const showQueue = config.queue?.enabled ?? true;
        const protectStats = config.stats?.protected ?? false
        const protectQueue = config.queue?.protected ?? false;
        const globalProtected = app.api_protected

        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''

        // Use query param for auth to avoid header/CORS issues
        const appendAuth = (url: string) => {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}apikey=${apiKey}`;
        }

        let queueCount: number | 'protected' = 0
        let albumsCount: number | 'protected' = 0

        // Fetch Queue
        if (showQueue) {
            if ((globalProtected || protectQueue) && !isAuthenticated) {
                queueCount = 'protected'
            } else {
                try {
                    const queueRes = await fetch(appendAuth(`${baseUrl}/api/v1/queue?pageSize=1`))
                    if (queueRes.ok) {
                        const data = await queueRes.json()
                        queueCount = data.totalRecords || (Array.isArray(data.records) ? data.records.length : 0)
                    }
                } catch (e) {
                    console.error("Lidarr queue fetch failed", e)
                }
            }
        }

        // Fetch Stats (Albums)
        if (showStats) {
            if ((globalProtected || protectStats) && !isAuthenticated) {
                albumsCount = 'protected'
            } else {
                try {
                    const albumsRes = await fetch(appendAuth(`${baseUrl}/api/v1/album`))
                    if (albumsRes.ok) {
                        const data = await albumsRes.json();
                        albumsCount = Array.isArray(data) ? data.length : (data.totalRecords || 0);
                    }
                } catch (e) {
                    console.error("Lidarr albums fetch failed", e)
                }
            }
        }

        return {
            'top': queueCount === 'protected' ? 'protected' : {
                label: 'Queue',
                value: queueCount,
                icon: 'ArrowUpFromLine',
                color: 'text-orange-400'
            },
            'bottom': albumsCount === 'protected' ? 'protected' : {
                label: 'Albums',
                value: albumsCount,
                icon: 'Disc',
                color: 'text-neon-purple'
            }
        }
    }
}
