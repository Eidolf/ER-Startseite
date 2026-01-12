import { useState, useEffect } from 'react'
import { AppData } from '../types'
import { AppIcon } from './AppIcon'
import { X, ExternalLink, Lock, Film, Tv, RefreshCw, AlertCircle, Disc, Mic2, Calendar, ArrowUpFromLine } from 'lucide-react'

interface AppDetailsModalProps {
    app: AppData | null
    isOpen: boolean
    onClose: () => void
    isAuthenticated: boolean
    onUnlock: () => void
}

export function AppDetailsModal({ app, isOpen, onClose, isAuthenticated, onUnlock }: AppDetailsModalProps) {
    const [stats, setStats] = useState<{
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
    } | null>(null)
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
            // Ombi also supports 'ApiKey' header, but X-Api-Key is standard.
            if (app.integration === 'ombi') {
                headers['ApiKey'] = apiKey; // Keep legacy header for Ombi just in case
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

                    if (!showMovies && !showTv) {
                        setStats({ ombi: { movies: { processing: 0, pending: 0 }, tv: { processing: 0, pending: 0 } } })
                        return
                    }

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
                    const showCalendar = config.calendar?.enabled ?? true
                    const protectStats = config.stats?.protected ?? false
                    const protectCalendar = config.calendar?.protected ?? false
                    const globalProtected = app.api_protected

                    if (!showStats && !showCalendar) {
                        setStats({ lidarr: { artists: 0, albums: 0, queue: 0, upcoming: [] } })
                        return;
                    }

                    // Use query param for auth to avoid header/CORS issues in some browser/proxy setups
                    const appendAuth = (url: string) => {
                        const separator = url.includes('?') ? '&' : '?';
                        return `${url}${separator}apikey=${apiKey}`;
                    }

                    let artistsCount = 0
                    let albumsCount = 0
                    let queueCount = 0
                    let upcomingReleases: Array<Record<string, unknown>> | 'protected' = []

                    // Fetch Stats (Artists/Albums)
                    if (showStats) {
                        if ((globalProtected || protectStats) && !isAuthenticated) {
                            // Protected, don't fetch or set special flag?
                            // We set -1 to indicate protected
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
                            }))
                        }
                    })
                }

            } catch (e) {
                console.error("Fetch failed", e)
                setError(e instanceof Error ? e.message : "Failed to fetch data")
            } finally {
                setLoading(false)
            }
        }

        if (isOpen && (app?.integration === 'ombi' || app?.integration === 'lidarr') && app?.api_key) {
            fetchStats()
        } else {
            setStats(null)
            setError('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, app, isAuthenticated])

    if (!isOpen || !app) return null

    const config = app.api_config || {}
    const showMovies = config.movies?.enabled ?? true
    const showTv = config.tv?.enabled ?? true
    const showQueue = config.queue?.enabled ?? true
    const protectQueue = config.queue?.protected ?? false
    const globalProtected = app.api_protected
    const isQueueProtected = (globalProtected || protectQueue) && !isAuthenticated && stats?.lidarr?.queue === -1;


    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel relative animate-in fade-in zoom-in-95 duration-200">

                {/* Header with App Icon */}
                <div className="relative p-6 px-12 pt-16 flex flex-col items-center border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-24 h-24 bg-black/40 rounded-2xl p-3 shadow-2xl border border-white/10 mb-4 transform hover:scale-105 transition-transform duration-300">
                        <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain filter drop-shadow-lg" />
                    </div>
                    <h2 className="text-xl font-bold text-white text-center mb-1">{app.name}</h2>
                    {app.description && (
                        <p className="text-sm text-gray-400 text-center max-w-[250px] line-clamp-2">{app.description}</p>
                    )}
                </div>

                {/* Stats / Actions */}
                <div className="p-4 space-y-3">
                    {/* Launch Button */}
                    <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all group hover:border-neon-cyan/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    >
                        <ExternalLink className="w-4 h-4 group-hover:text-neon-cyan transition-colors" />
                        Open Application
                    </a>

                    {/* INTEGRATION STATS */}
                    {(app.integration === 'ombi' || app.integration === 'lidarr') && (
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-4">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                {app.integration === 'ombi' ? 'Requests' : 'Library & Releases'}
                            </h3>

                            {loading ? (
                                <div className="flex items-center justify-center py-4 text-gray-500 gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Fetching stats...</span>
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center py-2 text-red-400 gap-2 bg-red-500/10 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs">{error}</span>
                                </div>
                            ) : stats ? (
                                <>
                                    {/* OMBI STATS */}
                                    {stats.ombi && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Movies */}
                                            {showMovies && (
                                                <div className="bg-white/5 rounded-lg p-3 flex flex-col items-center gap-1 border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Film className="w-3 h-3 text-purple-500" />
                                                    </div>
                                                    <span className="text-xs text-gray-400">Movies</span>
                                                    {stats.ombi.movies === 'protected' ? (
                                                        <button onClick={onUnlock} className="flex flex-col items-center gap-1 mt-1 text-gray-500 hover:text-white transition">
                                                            <Lock className="w-5 h-5" />
                                                            <span className="text-[10px]">Unlock</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 w-full mt-1">
                                                            <div className="flex justify-between w-full text-[10px]">
                                                                <span className="text-purple-300">Processing</span>
                                                                <span className="font-bold text-white">{stats.ombi.movies.processing}</span>
                                                            </div>
                                                            <div className="flex justify-between w-full text-[10px]">
                                                                <span className="text-yellow-300">Pending</span>
                                                                <span className="font-bold text-white">{stats.ombi.movies.pending}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* TV */}
                                            {showTv && (
                                                <div className="bg-white/5 rounded-lg p-3 flex flex-col items-center gap-1 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Tv className="w-3 h-3 text-blue-500" />
                                                    </div>
                                                    <span className="text-xs text-gray-400">TV Series</span>
                                                    {stats.ombi.tv === 'protected' ? (
                                                        <button onClick={onUnlock} className="flex flex-col items-center gap-1 mt-1 text-gray-500 hover:text-white transition">
                                                            <Lock className="w-5 h-5" />
                                                            <span className="text-[10px]">Unlock</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 w-full mt-1">
                                                            <div className="flex justify-between w-full text-[10px]">
                                                                <span className="text-blue-300">Processing</span>
                                                                <span className="font-bold text-white">{stats.ombi.tv.processing}</span>
                                                            </div>
                                                            <div className="flex justify-between w-full text-[10px]">
                                                                <span className="text-yellow-300">Pending</span>
                                                                <span className="font-bold text-white">{stats.ombi.tv.pending}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* LIDARR STATS */}
                                    {stats.lidarr && (
                                        <div className="space-y-4">
                                            {/* General Stats */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                                    <Mic2 className="w-3 h-3 text-neon-cyan mx-auto mb-1" />
                                                    <span className="block text-[10px] text-gray-400">Artists</span>
                                                    <span className="text-sm font-bold text-white">{stats.lidarr.artists === -1 ? <Lock className="w-3 h-3 mx-auto text-red-500" /> : stats.lidarr.artists}</span>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                                    <Disc className="w-3 h-3 text-neon-purple mx-auto mb-1" />
                                                    <span className="block text-[10px] text-gray-400">Albums</span>
                                                    <span className="text-sm font-bold text-white">{stats.lidarr.albums === -1 ? <Lock className="w-3 h-3 mx-auto text-red-500" /> : stats.lidarr.albums}</span>
                                                </div>
                                                {/* Queue */}
                                                {(showQueue) && (
                                                    <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5 relative group">
                                                        {isQueueProtected ? (
                                                            <div onClick={onUnlock} className="flex flex-col items-center cursor-pointer">
                                                                <Lock className="w-3 h-3 text-red-500 mb-1" />
                                                                <span className="text-[10px] text-red-500">Queue</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <ArrowUpFromLine className="w-3 h-3 text-orange-400 mx-auto mb-1" />
                                                                <span className="block text-[10px] text-gray-400">Queue</span>
                                                                <span className="text-sm font-bold text-white">{stats.lidarr.queue === -1 ? <Lock className="w-3 h-3 mx-auto text-red-500" /> : stats.lidarr.queue}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Weekly Releases */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">This Week</span>
                                                </div>
                                                {stats.lidarr.upcoming === 'protected' ? (
                                                    <button onClick={onUnlock} className="w-full py-4 flex flex-col items-center gap-2 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/10 transition group">
                                                        <Lock className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                                        <span className="text-xs text-gray-400 group-hover:text-gray-300">Protected Content</span>
                                                    </button>
                                                ) : stats.lidarr.upcoming.length > 0 ? (
                                                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                                        {Array.isArray(stats.lidarr.upcoming) && stats.lidarr.upcoming.map(album => (
                                                            <div key={album.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5 hover:border-white/10 transition">
                                                                <div className="w-10 h-10 bg-black/40 rounded overflow-hidden shrink-0">
                                                                    {album.cover ? (
                                                                        <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <Disc className="w-4 h-4 text-gray-600" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-xs font-medium text-white truncate">{album.title}</div>
                                                                    <div className="text-[10px] text-gray-400 truncate">{album.artist}</div>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {new Date(album.releaseDate).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 bg-white/5 rounded-lg border border border-dashed border-white/10">
                                                        <span className="text-xs text-gray-500">No releases this week</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 min-h-[100px] text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {app.description || <span className="text-gray-600 italic">No description available.</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
