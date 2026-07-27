import React, { useState, useEffect, useCallback } from 'react'
import { Hourglass, Calendar } from 'lucide-react'

interface VacationWidgetProps {
    title?: string
    targetDate?: string
}

interface TimeLeft {
    days: number
    hours: number
    minutes: number
    seconds: number
    isPast: boolean
}

export const VacationWidget: React.FC<VacationWidgetProps> = ({
    title = 'Countdown Event',
    targetDate,
}) => {
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
              month: '2-digit',
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
                        <Hourglass className="w-4 h-4 text-cyan-300" />
                    </div>
                    <span className="font-semibold text-xs tracking-wider uppercase text-cyan-200 truncate">
                        {title}
                    </span>
                </div>
            </div>

            {/* Countdown Display */}
            <div className="my-auto py-2 z-10">
                {!targetDate ? (
                    <div className="flex flex-col items-center justify-center text-center py-2">
                        <Calendar className="w-6 h-6 text-cyan-400/60 mb-1" />
                        <p className="text-xs text-gray-400">Kein Zieldatum konfiguriert</p>
                        <span className="text-[10px] text-gray-500">Klicke zum Einstellen des Zieldatums</span>
                    </div>
                ) : timeLeft.isPast ? (
                    <div className="text-center py-2 animate-pulse">
                        <span className="text-xl font-black bg-gradient-to-r from-emerald-400 via-teal-200 to-cyan-400 bg-clip-text text-transparent">
                            Event ist da! 🎉
                        </span>
                        <p className="text-[10px] text-emerald-300 mt-1">Zielzeit erreicht!</p>
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
                    <span>Countdown Widget</span>
                )}
            </div>
        </div>
    )
}
