import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface ClockWidgetProps {
    is24Hour?: boolean
    showSeconds?: boolean
    dateFormat?: 'full' | 'short' | 'none'
}

export function ClockWidget({
    is24Hour = true,
    showSeconds = false,
    dateFormat = 'full',
}: ClockWidgetProps) {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        hour12: !is24Hour,
    }

    const formattedTime = time.toLocaleTimeString([], timeOptions)

    const getDateOptions = (): Intl.DateTimeFormatOptions | null => {
        if (dateFormat === 'none') return null
        if (dateFormat === 'short') return { day: 'numeric', month: 'short' }
        return { weekday: 'long', day: 'numeric', month: 'short' }
    }

    const dateOptions = getDateOptions()
    const formattedDate = dateOptions ? time.toLocaleDateString([], dateOptions) : null

    return (
        <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md relative overflow-hidden">
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
