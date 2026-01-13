import { PremiumAppManifest, FetchContext } from './types'

export const RadarrManifest: PremiumAppManifest = {
    id: 'radarr',
    name: 'Radarr',
    layout: 'mixed',
    configurableFeatures: ['queue', 'movies'],
    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const config = app.api_config || {}
        const showQueue = config.queue?.enabled ?? true;
        const showMovies = config.movies?.enabled ?? true;
        const protectQueue = config.queue?.protected ?? false;
        const protectMovies = config.movies?.protected ?? false;
        const globalProtected = app.api_protected

        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''
        const appendAuth = (url: string) => `${url}${url.includes('?') ? '&' : '?'}apikey=${apiKey}`

        let queueCount: number | 'protected' = 0
        let movieCount: number | 'protected' = 0

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
                } catch (e) { console.error("Radarr queue fetch failed", e) }
            }
        }

        if (showMovies) {
            if ((globalProtected || protectMovies) && !isAuthenticated) {
                movieCount = 'protected'
            } else {
                try {
                    const res = await fetch(appendAuth(`${baseUrl}/api/v3/movie`))
                    if (res.ok) {
                        const data = await res.json()
                        movieCount = Array.isArray(data) ? data.length : 0
                    }
                } catch (e) { console.error("Radarr movie fetch failed", e) }
            }
        }

        return {
            'top': queueCount === 'protected' ? 'protected' : {
                label: 'Queue',
                value: queueCount,
                icon: 'ArrowUpFromLine',
                color: 'text-orange-400'
            },
            'bottom': movieCount === 'protected' ? 'protected' : {
                label: 'Movies',
                value: movieCount,
                icon: 'Film',
                color: 'text-blue-400'
            }
        }
    }
}
