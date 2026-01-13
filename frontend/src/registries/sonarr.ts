import { PremiumAppManifest, FetchContext } from './types'

export const SonarrManifest: PremiumAppManifest = {
    id: 'sonarr',
    name: 'Sonarr',
    layout: 'mixed',
    configurableFeatures: ['queue', 'series'],
    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const config = app.api_config || {}
        const showQueue = config.queue?.enabled ?? true;
        const showSeries = config.series?.enabled ?? true;
        const protectQueue = config.queue?.protected ?? false;
        const protectSeries = config.series?.protected ?? false;
        const globalProtected = app.api_protected

        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''
        const appendAuth = (url: string) => `${url}${url.includes('?') ? '&' : '?'}apikey=${apiKey}`

        let queueCount: number | 'protected' = 0
        let seriesCount: number | 'protected' = 0

        if (showQueue) {
            if ((globalProtected || protectQueue) && !isAuthenticated) {
                queueCount = 'protected'
            } else {
                try {
                    const res = await fetch(appendAuth(`${baseUrl}/api/v3/queue?pageSize=1`))
                    if (res.ok) {
                        const data = await res.json()
                        queueCount = data.totalRecords || 0
                    }
                } catch (e) { console.error("Sonarr queue fetch failed", e) }
            }
        }

        if (showSeries) {
            if ((globalProtected || protectSeries) && !isAuthenticated) {
                seriesCount = 'protected'
            } else {
                try {
                    const res = await fetch(appendAuth(`${baseUrl}/api/v3/series`))
                    if (res.ok) {
                        const data = await res.json()
                        seriesCount = Array.isArray(data) ? data.length : 0
                    }
                } catch (e) { console.error("Sonarr series fetch failed", e) }
            }
        }

        return {
            'top': queueCount === 'protected' ? 'protected' : {
                label: 'Queue',
                value: queueCount,
                icon: 'ArrowUpFromLine',
                color: 'text-orange-400'
            },
            'bottom': seriesCount === 'protected' ? 'protected' : {
                label: 'Series',
                value: seriesCount,
                icon: 'Tv',
                color: 'text-blue-400'
            }
        }
    }
}
