import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export function ClockWidget() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-2 right-2 opacity-20">
                <Clock className="w-12 h-12 text-white" />
            </div>
            <div className="text-4xl font-bold text-white tracking-wider font-mono">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-gray-400 mt-1 font-medium bg-white/5 py-1 px-3 rounded-full">
                {time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
        </div>
    )
}
