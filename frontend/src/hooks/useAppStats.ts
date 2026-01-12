import { useState, useEffect } from 'react'
import { AppData } from '../types'

interface AppStats {
    ombi?: {
        movies: { processing: number, pending: number } | 'protected',
        tv: { processing: number, pending: number } | 'protected'
    },
    lidarr?: {
        artists: number,
        albums: number,
        queue: number,
        upcoming: Array<{ id: number, title: string, releaseDate: string, artist: string, cover?: string }> | 'protected'
    }
}

export function useAppStats(app: AppData, isAuthenticated: boolean) {
    const [stats, setStats] = useState<AppStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Helper to fetch through backend proxy for HTTP URLs on HTTPS pages
    const proxyFetch = async (url: string, options?: { headers?: Record<string, string>, method?: string, body?: unknown }) => {
        const isHttpUrl = url.startsWith('http://');
        const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

        if (isHttpUrl && isHttpsPage) {
            // Route through backend proxy to avoid Mixed Content
            const proxyRes = await fetch('/api/v1/proxy/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    method: options?.method || 'GET',
                    headers: options?.headers,
                    body: options?.body
                })
            });
            const proxyData = await proxyRes.json();
            if (!proxyRes.ok) {
                throw new Error(proxyData.detail || `Proxy error: ${proxyRes.status}`);
            }
            // Return a mock Response-like object
            return {
                ok: proxyData.status_code >= 200 && proxyData.status_code < 300,
                status: proxyData.status_code,
                json: async () => proxyData.data,
                text: async () => typeof proxyData.data === 'string' ? proxyData.data : JSON.stringify(proxyData.data)
            };
        } else {
            // Direct fetch for HTTPS URLs or HTTP pages
            return fetch(url, { headers: options?.headers });
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            if (!app?.api_key || !app.integration) return

            setLoading(true)
            setError('')

            const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
            if (!baseUrl) {
                setError("No URL configured")
                setLoading(false)
                return
            }
            const apiKey = app.api_key.trim();
            const headers: Record<string, string> = { 'X-Api-Key': apiKey }
            if (app.integration === 'ombi') {
                headers['ApiKey'] = apiKey;
            }

            try {
                if (app.integration === 'ombi') {
                    // OMBI LOGIC
                    const config = app.api_config || {}
                    const showMovies = config.movies?.enabled ?? true
                    const showTv = config.tv?.enabled ?? true
                    const protectMovies = config.movies?.protected ?? false
                    const protectTv = config.tv?.protected ?? false
                    const globalProtected = app.api_protected

                    let moviesResult: { processing: number, pending: number } | 'protected' = { processing: 0, pending: 0 }
                    let tvResult: { processing: number, pending: number } | 'protected' = { processing: 0, pending: 0 }

                    if (showMovies) {
                        if ((globalProtected || protectMovies) && !isAuthenticated) {
                            moviesResult = 'protected'
                        } else {
                            const res = await proxyFetch(`${baseUrl}/api/v1/Request/movie`, { headers })
                            if (!res.ok) throw new Error(`Movies API: ${res.status}`)
                            const data = await res.json()
                            if (Array.isArray(data)) {
                                moviesResult = {
                                    processing: data.filter((i: Record<string, unknown>) => i.approved && !i.available && !i.denied).length,
                                    pending: data.filter((i: Record<string, unknown>) => !i.approved && !i.denied).length
                                }
                            }
                        }
                    }

                    if (showTv) {
                        if ((globalProtected || protectTv) && !isAuthenticated) {
                            tvResult = 'protected'
                        } else {
                            const res = await proxyFetch(`${baseUrl}/api/v1/Request/tv`, { headers })
                            if (!res.ok) throw new Error(`TV API: ${res.status}`)
                            const data = await res.json()
                            if (Array.isArray(data)) {
                                tvResult = {
                                    processing: data.filter((i: Record<string, unknown>) => !i.approved && !i.denied).length,
                                    pending: data.filter((i: Record<string, unknown>) => i.approved && !i.available && !i.denied).length
                                }
                            }
                        }
                    }

                    setStats({ ombi: { movies: moviesResult, tv: tvResult } })

                } else if (app.integration === 'lidarr') {
                    // LIDARR LOGIC
                    const config = app.api_config || {}
                    const showStats = config.stats?.enabled ?? true
                    const showQueue = config.queue?.enabled ?? true;
                    const showCalendar = config.calendar?.enabled ?? true
                    const protectStats = config.stats?.protected ?? false
                    const protectQueue = config.queue?.protected ?? false;
                    const protectCalendar = config.calendar?.protected ?? false
                    const globalProtected = app.api_protected

                    // Use query param for auth to avoid header/CORS issues
                    const appendAuth = (url: string) => {
                        const separator = url.includes('?') ? '&' : '?';
                        return `${url}${separator}apikey=${apiKey}`;
                    }

                    let artistsCount = 0
                    let albumsCount = 0
                    let queueCount = 0
                    let upcomingReleases: Array<Record<string, unknown>> | 'protected' = []

                    // Fetch Stats
                    if (showStats) {
                        if ((globalProtected || protectStats) && !isAuthenticated) {
                            artistsCount = -1
                            albumsCount = -1
                        } else {
                            const [artistsRes, albumsRes] = await Promise.all([
                                proxyFetch(appendAuth(`${baseUrl}/api/v1/artist`)),
                                proxyFetch(appendAuth(`${baseUrl}/api/v1/album`))
                            ])

                            if (artistsRes.ok) {
                                const data = await artistsRes.json();
                                artistsCount = Array.isArray(data) ? data.length : (data.totalRecords || 0);
                            }
                            if (albumsRes.ok) {
                                const data = await albumsRes.json();
                                albumsCount = Array.isArray(data) ? data.length : (data.totalRecords || 0);
                            }
                        }
                    }

                    // Fetch Queue
                    if (showQueue) {
                        if ((globalProtected || protectQueue) && !isAuthenticated) {
                            queueCount = -1 // Indicate protected
                        } else {
                            const queueRes = await proxyFetch(appendAuth(`${baseUrl}/api/v1/queue?pageSize=1`))
                            if (queueRes.ok) {
                                const data = await queueRes.json()
                                queueCount = data.totalRecords || (Array.isArray(data.records) ? data.records.length : 0)
                            }
                        }
                    }

                    // Fetch Calendar
                    if (showCalendar) {
                        if ((globalProtected || protectCalendar) && !isAuthenticated) {
                            upcomingReleases = 'protected'
                        } else {
                            const calendarRes = await proxyFetch(appendAuth(`${baseUrl}/api/v1/calendar?start=${new Date().toISOString().split('T')[0]}&end=${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}`))
                            if (calendarRes.ok) {
                                upcomingReleases = await calendarRes.json();
                            }
                        }
                    }

                    setStats({
                        lidarr: {
                            artists: artistsCount,
                            albums: albumsCount,
                            queue: queueCount,
                            upcoming: upcomingReleases === 'protected' ? 'protected' : upcomingReleases.map((album: Record<string, unknown>) => ({
                                id: album.id as number,
                                title: album.title as string,
                                releaseDate: album.releaseDate as string,
                                artist: ((album.artist as Record<string, unknown>)?.artistName as string) || 'Unknown Artist',
                                cover: ((album.images as Array<Record<string, unknown>>)?.find((img: Record<string, unknown>) => img.coverType === 'Cover')?.url as string | undefined)
                            })) as Array<{ id: number; title: string; releaseDate: string; artist: string; cover?: string }>
                        }
                    })
                }
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
