import { useState, useEffect } from 'react'
import { AppData } from '../types'
import { AppRegistry } from '../registries'
import { FetchStatsResult } from '../registries/types'
import { fetchProxy } from '../utils/fetchProxy'

export function useAppStats(app: AppData, isAuthenticated: boolean) {
    const [stats, setStats] = useState<FetchStatsResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchStats = async () => {
            if (!app.integration) return

            const manifest = AppRegistry[app.integration]
            if (!manifest) {
                // Not a registry app
                return
            }

            // API stats should ONLY be fetched if an API key is explicitly configured and non-empty
            const hasApiKey = !!app.api_key && app.api_key.trim().length > 0
            const hasUrl = !!(app.url || app.api_url)
            if (!hasApiKey || !hasUrl) {
                setStats(null)
                setLoading(false)
                setError('')
                return
            }

            setLoading(true)
            setError('')

            try {
                const result = await manifest.fetchStats({
                    app,
                    isAuthenticated,
                    // @ts-expect-error - fetchProxy signature slightly differs from window.fetch but is compatible for our usage
                    fetch: fetchProxy
                })
                setStats(result)
            } catch (err: unknown) {
                console.error("Fetch Stats Error:", err)
                setError(err instanceof Error ? err.message : 'Failed to fetch stats')
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
        // Poll every 60s
        const interval = setInterval(fetchStats, 60000)
        return () => clearInterval(interval)
    }, [app, isAuthenticated])

    return { stats, loading, error }
}
