import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface ClockWidgetProps {
    is24Hour?: boolean
    showSeconds?: boolean
    dateFormat?: 'full' | 'short' | 'none'
    timeZone?: string
    useAppDesign?: boolean
}

export function ClockWidget({
    is24Hour = true,
    showSeconds = false,
    dateFormat = 'full',
    timeZone,
    useAppDesign = false,
}: ClockWidgetProps) {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    let validTimeZone: string | undefined = undefined
    if (timeZone && timeZone.trim()) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timeZone.trim() })
            validTimeZone = timeZone.trim()
        } catch {
            validTimeZone = undefined
        }
    }

    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        hour12: !is24Hour,
        timeZone: validTimeZone,
    }

    const formattedTime = time.toLocaleTimeString([], timeOptions)

    const getDateOptions = (): Intl.DateTimeFormatOptions | null => {
        if (dateFormat === 'none') return null
        const opts: Intl.DateTimeFormatOptions =
            dateFormat === 'short'
                ? { day: 'numeric', month: 'short' }
                : { weekday: 'long', day: 'numeric', month: 'short' }
        if (validTimeZone) {
            opts.timeZone = validTimeZone
        }
        return opts
    }

    const dateOptions = getDateOptions()
    const formattedDate = dateOptions ? time.toLocaleDateString([], dateOptions) : null

    return (
        <div className={`w-full h-full p-4 flex flex-col items-center justify-center relative overflow-hidden ${
            useAppDesign ? 'bg-transparent border-0 rounded-none shadow-none backdrop-blur-none' : 'bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md'
        }`}>
            <div className="absolute top-2 right-2 opacity-20">
                <Clock className="w-12 h-12 text-white" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white tracking-wider font-mono text-center">
                {formattedTime}
            </div>
            {formattedDate && (
                <div className="text-xs md:text-sm text-gray-400 mt-2 font-medium bg-white/5 py-1 px-3 rounded-full">
                    {formattedDate}
                </div>
            )}
        </div>
    )
}
