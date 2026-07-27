import { PremiumAppManifest, FetchContext } from './types'

export const TrekManifest: PremiumAppManifest = {
    id: 'trek',
    name: 'TREK Vacation Planner',
    icon: 'Palmtree',
    layout: 'mixed',
    configurableFeatures: ['vacation'],
    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const config = app.api_config || {}
        const isProtected = app.api_protected ?? true

        // If app stats are protected and user is not authenticated as admin,
        // suppress private trip countdown stats for public visitors!
        if (isProtected && !isAuthenticated) {
            return {
                top: 'protected',
                bottom: 'protected',
            }
        }

        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''

        let tripName = 'Nächster Urlaub'
        let targetDate: string | null = null

        // Try fetching live API if configured, otherwise fallback to local app config
        if (baseUrl) {
            try {
                const headers: Record<string, string> = { Accept: 'application/json' }
                if (apiKey) {
                    headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
                }
                const res = await fetch(`${baseUrl}/api/v1/trips`, { headers })
                if (res.ok) {
                    const data = await res.json()
                    const trips = Array.isArray(data) ? data : [data]
                    const now = new Date().getTime()
                    const upcoming = trips.find(t => new Date(t.startDate || t.date || 0).getTime() >= now) || trips[0]
                    if (upcoming) {
                        tripName = upcoming.name || upcoming.title || tripName
                        targetDate = upcoming.startDate || upcoming.date || null
                    }
                }
            } catch (e) {
                console.error("TREK fetchStats failed", e)
            }
        }

        if (!targetDate && config.vacationDate) {
            targetDate = String(config.vacationDate)
            tripName = String(config.vacationTitle || tripName)
        }

        const parsedDate = targetDate ? new Date(targetDate) : null
        if (!parsedDate || isNaN(parsedDate.getTime())) {
            return {
                top: {
                    label: tripName,
                    value: 'Geplant',
                    icon: 'Palmtree',
                    color: 'text-emerald-400'
                },
                bottom: null
            }
        }

        const diffMs = parsedDate.getTime() - new Date().getTime()
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

        return {
            top: {
                label: tripName,
                value: daysLeft > 0 ? `${daysLeft} Tage` : 'Läuft! 🎉',
                icon: 'Palmtree',
                color: 'text-emerald-400'
            },
            bottom: {
                label: 'Ziel-Datum',
                value: parsedDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
                icon: 'Calendar',
                color: 'text-cyan-400'
            }
        }
    }
}
