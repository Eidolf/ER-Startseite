import React, { useState, useEffect, useCallback } from 'react'
import { Palmtree, Calendar, MapPin, RefreshCw, AlertCircle } from 'lucide-react'

interface VacationWidgetProps {
    title?: string
    targetDate?: string
    apiUrl?: string
    apiKey?: string
}

interface TimeLeft {
    days: number
    hours: number
    minutes: number
    seconds: number
    isPast: boolean
}

export const VacationWidget: React.FC<VacationWidgetProps> = ({
    title: initialTitle = 'Nächster Urlaub',
    targetDate: initialTargetDate,
    apiUrl,
    apiKey,
}) => {
    const [title, setTitle] = useState(initialTitle)
    const [targetDate, setTargetDate] = useState<string | undefined>(initialTargetDate)
    const [destination, setDestination] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Fetch from TREK API or custom REST API endpoint if apiUrl is provided
    useEffect(() => {
        if (!apiUrl) return

        let isMounted = true
        setLoading(true)
        setError(null)

        const fetchVacation = async () => {
            try {
                const headers: Record<string, string> = {
                    Accept: 'application/json',
                }
                if (apiKey) {
                    headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
                }

                const res = await fetch(apiUrl, { headers })
                if (!res.ok) {
                    throw new Error(`API response HTTP ${res.status}`)
                }
                const data = await res.json()

                if (!isMounted) return

                // Handle array of trips or single trip payload (TREK REST API or custom format)
                let trip = data
                if (Array.isArray(data)) {
                    // Find upcoming trip with start date >= now, or take first element
                    const now = new Date().getTime()
                    const sorted = [...data].sort((a, b) => {
                        const dateA = new Date(a.startDate || a.date || a.targetDate || 0).getTime()
                        const dateB = new Date(b.startDate || b.date || b.targetDate || 0).getTime()
                        return dateA - dateB
                    })
                    trip = sorted.find((t) => new Date(t.startDate || t.date || t.targetDate || 0).getTime() >= now) || sorted[0]
                }

                if (trip) {
                    const fetchedTitle = trip.name || trip.title || trip.destination || initialTitle
                    const fetchedDate = trip.startDate || trip.date || trip.targetDate || trip.start_date
                    const fetchedDest = trip.destination || trip.location || trip.city

                    if (fetchedTitle) setTitle(fetchedTitle)
                    if (fetchedDate) setTargetDate(fetchedDate)
                    if (fetchedDest) setDestination(fetchedDest)
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'API Fetch Fehler')
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchVacation()
        return () => {
            isMounted = false
        }
    }, [apiUrl, apiKey, initialTitle])

    // Calculate time left
    const calculateTimeLeft = useCallback((): TimeLeft => {
        if (!targetDate) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false }
        }

        const target = new Date(targetDate).getTime()
        const now = new Date().getTime()
        const difference = target - now

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
            isPast: false,
        }
    }, [targetDate])

    const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft)

    useEffect(() => {
        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)
        return () => clearInterval(timer)
    }, [calculateTimeLeft])

    const formattedTargetDate = targetDate
        ? new Date(targetDate).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : null

    return (
        <div className="relative w-full h-full p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900/90 to-emerald-950/70 border border-cyan-500/30 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden group select-none">
            {/* Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2 text-cyan-400 min-w-0">
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 shrink-0">
                        <Palmtree className="w-4 h-4 text-cyan-300" />
                    </div>
                    <span className="font-semibold text-xs tracking-wider uppercase text-cyan-200 truncate">
                        {title}
                    </span>
                </div>
                {destination && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{destination}</span>
                    </div>
                )}
            </div>

            {/* Countdown Display */}
            <div className="my-auto py-2 z-10">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-cyan-300 py-3">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Lade Urlaubsdaten...</span>
                    </div>
                ) : !targetDate ? (
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <Calendar className="w-6 h-6 text-cyan-400/60 mb-1" />
                        <p className="text-xs text-gray-400">Kein Datum konfiguriert</p>
                        <span className="text-[10px] text-gray-500">Konfiguriere ein Urlaubsdatum</span>
                    </div>
                ) : timeLeft.isPast ? (
                    <div className="text-center py-2 animate-pulse">
                        <span className="text-xl font-black bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400 bg-clip-text text-transparent">
                            Urlaub läuft! 🎉✈️
                        </span>
                        <p className="text-[10px] text-emerald-300 mt-1">Gute Reise & Erholung!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                            <span className="text-lg sm:text-2xl font-black text-cyan-200 leading-none">
                                {timeLeft.days}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 font-medium">
                                Tage
                            </span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                            <span className="text-lg sm:text-2xl font-black text-cyan-200 leading-none">
                                {String(timeLeft.hours).padStart(2, '0')}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 font-medium">
                                Std
                            </span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                            <span className="text-lg sm:text-2xl font-black text-cyan-200 leading-none">
                                {String(timeLeft.minutes).padStart(2, '0')}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 font-medium">
                                Min
                            </span>
                        </div>
                        <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                            <span className="text-lg sm:text-2xl font-black text-emerald-300 leading-none">
                                {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 mt-1 font-medium">
                                Sek
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5 z-10">
                {formattedTargetDate ? (
                    <div className="flex items-center gap-1 text-gray-300">
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        <span>{formattedTargetDate}</span>
                    </div>
                ) : (
                    <span>Urlaubs-Counter</span>
                )}
                {error && (
                    <span className="text-amber-400 flex items-center gap-1" title={error}>
                        <AlertCircle className="w-3 h-3" /> API Offline
                    </span>
                )}
            </div>
        </div>
    )
}
