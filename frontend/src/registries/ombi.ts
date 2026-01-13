import { PremiumAppManifest, FetchContext } from './types'

export const OmbiManifest: PremiumAppManifest = {
    id: 'ombi',
    name: 'Ombi',
    layout: 'rows-2',
    configurableFeatures: ['movies', 'tv'],
    // Current UI: 
    // Row 1: Movies Pending (if > 0 or configured)
    // Row 2: TV Pending (if > 0 or configured)
    // If only one, it handles it. 
    // We can map 'top' and 'bottom'.

    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const config = app.api_config || {}
        const showMovies = config.movies?.enabled ?? true
        const showTv = config.tv?.enabled ?? true
        const protectMovies = config.movies?.protected ?? false
        const protectTv = config.tv?.protected ?? false
        const globalProtected = app.api_protected

        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''

        const headers: Record<string, string> = {
            'X-Api-Key': apiKey,
            'ApiKey': apiKey
        }

        let moviePending = 0
        let tvPending = 0
        let moviesProtected = false
        let tvProtected = false

        if (showMovies) {
            if ((globalProtected || protectMovies) && !isAuthenticated) {
                moviesProtected = true
            } else {
                try {
                    const res = await fetch(`${baseUrl}/api/v1/Request/movie`, { headers })
                    if (res.ok) {
                        const data: Array<{ approved: boolean, available: boolean, denied: boolean }> = await res.json()
                        if (Array.isArray(data)) {
                            moviePending = data.filter((i) => !i.approved && !i.denied).length
                        }
                    }
                } catch (e) {
                    console.error("Ombi movie fetch failed", e)
                }
            }
        }

        if (showTv) {
            if ((globalProtected || protectTv) && !isAuthenticated) {
                tvProtected = true
            } else {
                try {
                    const res = await fetch(`${baseUrl}/api/v1/Request/tv`, { headers })
                    if (res.ok) {
                        const data: Array<{ approved: boolean, available: boolean, denied: boolean }> = await res.json()
                        if (Array.isArray(data)) {
                            tvPending = data.filter((i) => !i.approved && !i.denied).length
                        }
                    }
                } catch (e) {
                    console.error("Ombi tv fetch failed", e)
                }
            }
        }

        // Return standardized stats
        // We aggregate total pending? Or separate?
        // Logic in existing RichAppTile: 
        // "return <div...>{totalPending} Pending</div>" -> It sums them up if both are present?
        // Wait, looking at RichAppTile.tsx:
        // "const totalPending = moviePending + tvPending"
        // It shows a SINGLE item "Pending".

        // So actually Ombi uses a Single Row layout currently.
        // Let's use 'rows-2' but only populate 'top' with the total.

        const totalPending = moviePending + tvPending
        const isProtected = (moviesProtected && showMovies) || (tvProtected && showTv) // Simplification

        if (totalPending === 0 && !isProtected) {
            return {
                'top': {
                    label: 'Pending',
                    value: 'No pending requests',
                    icon: 'CheckCircle', // or something
                    color: 'text-gray-500' // Override
                }
            }
        }

        return {
            'top': isProtected ? 'protected' : {
                label: 'Pending',
                value: totalPending,
                icon: 'AlertCircle',
                color: 'text-yellow-400'
            }
        }
    }
}
