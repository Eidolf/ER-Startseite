import React, { useState, useEffect } from 'react'

export function CalendarWidget() {
    const [date, setDate] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay() // 0 = Sunday

    // Adjust for Monday start if desired, but 0-6 Sun-Sat is standard JS
    // Let's make Monday start (European standard usually preferred given German context "ER-Startseite")
    const startOffset = firstDay === 0 ? 6 : firstDay - 1

    const days = []
    for (let i = 0; i < startOffset; i++) {
        days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
    }

    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

    return (
        <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col items-center shadow-xl">
            <div className="text-white font-medium mb-2 w-full flex justify-between items-center px-1">
                <span>{date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
            </div>

            <div className="grid grid-cols-7 gap-1 w-full text-center text-xs">
                {weekDays.map(d => (
                    <div key={d} className="text-gray-500 font-medium py-1">{d}</div>
                ))}

                {days.map((d, i) => (
                    <div key={i} className={`py-1 rounded-full ${d === date.getDate() ? 'bg-neon-cyan text-black font-bold shadow-lg shadow-neon-cyan/50' : 'text-gray-300'} ${!d ? '' : 'hover:bg-white/10 cursor-default'}`}>
                        {d}
                    </div>
                ))}
            </div>
        </div>
    )
}
