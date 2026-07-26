import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Plus, X, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

export interface CalendarEvent {
    id: string
    title: string
    dateStr: string // YYYY-MM-DD
    timeStr?: string // HH:MM
    reminderOffsetMinutes?: number // -1 = None, 0 = At time, 15 = 15m before, 60 = 1h before, 1440 = 1d before
    reminderTime?: number // absolute timestamp in ms
    reminderNotified?: boolean
}

const STORAGE_KEY = 'er_calendar_events'

export function CalendarWidget() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewDate, setViewDate] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    })

    const [selectedDay, setSelectedDay] = useState<number | null>(null)
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)
    const [missedEvents, setMissedEvents] = useState<CalendarEvent[]>([])

    // New Event Form State
    const [eventTitle, setEventTitle] = useState('')
    const [eventTime, setEventTime] = useState('12:00')
    const [reminderOffset, setReminderOffset] = useState<number>(0) // 0 = At event time

    // Save events to local storage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
        } catch (e) {
            console.error('Failed to save calendar events', e)
        }
    }, [events])

    // Clock timer & Reminder checking engine
    useEffect(() => {
        const checkReminders = () => {
            const now = Date.now()
            setCurrentDate(new Date())

            setEvents((prevEvents) => {
                let hasChanges = false
                const newlyMissed: CalendarEvent[] = []

                const updated = prevEvents.map((evt) => {
                    if (evt.reminderTime && !evt.reminderNotified) {
                        if (evt.reminderTime <= now) {
                            hasChanges = true
                            // Trigger native desktop notification
                            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                try {
                                    new Notification(`Reminder: ${evt.title}`, {
                                        body: `Scheduled for ${evt.dateStr} ${evt.timeStr || ''}`,
                                        icon: '/favicon.ico',
                                    })
                                } catch (e) {
                                    console.error('Failed to dispatch notification', e)
                                }
                            }
                            // Collect missed event for catch-up banner if overdue by > 1 minute
                            if (now - evt.reminderTime > 60000) {
                                newlyMissed.push(evt)
                            }
                            return { ...evt, reminderNotified: true }
                        }
                    }
                    return evt
                })

                if (newlyMissed.length > 0) {
                    setMissedEvents((prev) => [...prev, ...newlyMissed])
                }

                return hasChanges ? updated : prevEvents
            })
        }

        checkReminders()
        const interval = setInterval(checkReminders, 10000) // Check every 10 seconds
        return () => clearInterval(interval)
    }, [])

    const requestNotificationPermission = () => {
        if (typeof Notification !== 'undefined') {
            Notification.requestPermission()
        }
    }

    // Date math
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Monday start

    const days: (number | null)[] = []
    for (let i = 0; i < startOffset; i++) {
        days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
    }

    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

    const formatDateStr = (dayNum: number) => {
        const m = String(month + 1).padStart(2, '0')
        const d = String(dayNum).padStart(2, '0')
        return `${year}-${m}-${d}`
    }

    const handleDayClick = (dayNum: number) => {
        setSelectedDay(dayNum)
        setIsEventModalOpen(true)
        setEventTitle('')
        setEventTime('12:00')
        setReminderOffset(0)
    }

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDay || !eventTitle.trim()) return

        const dateStr = formatDateStr(selectedDay)
        let reminderTimestamp: number | undefined = undefined

        if (eventTime && reminderOffset >= 0) {
            const [hours, mins] = eventTime.split(':').map(Number)
            const eventDateTime = new Date(year, month, selectedDay, hours, mins).getTime()
            reminderTimestamp = eventDateTime - reminderOffset * 60 * 1000
        }

        const newEvt: CalendarEvent = {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: eventTitle.trim(),
            dateStr,
            timeStr: eventTime,
            reminderOffsetMinutes: reminderOffset,
            reminderTime: reminderTimestamp,
            reminderNotified: false,
        }

        setEvents((prev) => [...prev, newEvt])
        setEventTitle('')
        requestNotificationPermission()
    }

    const handleDeleteEvent = (id: string) => {
        setEvents((prev) => prev.filter((e) => e.id !== id))
    }

    const selectedDateStr = selectedDay ? formatDateStr(selectedDay) : ''
    const selectedDayEvents = events.filter((e) => e.dateStr === selectedDateStr)

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

    return (
        <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
            {/* Header & Controls */}
            <div className="text-white font-medium mb-2 w-full flex justify-between items-center px-1">
                <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition">
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-wide">
                        {viewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                    </span>
                    {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
                        <button
                            onClick={requestNotificationPermission}
                            className="p-1 text-amber-400 hover:text-amber-300 rounded-full bg-amber-500/10 border border-amber-500/20"
                            title="Enable desktop notifications for reminders"
                        >
                            <Bell className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Missed Reminders Catch-Up Banner */}
            {missedEvents.length > 0 && (
                <div className="w-full mb-2 p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">
                            {missedEvents.length} missed reminder{missedEvents.length > 1 ? 's' : ''}: {missedEvents[0].title}
                        </span>
                    </div>
                    <button
                        onClick={() => setMissedEvents([])}
                        className="text-amber-400 hover:text-white p-0.5 rounded"
                        title="Dismiss"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 w-full text-center text-xs flex-1">
                {weekDays.map((d) => (
                    <div key={d} className="text-gray-500 font-medium py-1">
                        {d}
                    </div>
                ))}

                {days.map((d, i) => {
                    if (!d) return <div key={i} />

                    const dateStr = formatDateStr(d)
                    const dayEvents = events.filter((e) => e.dateStr === dateStr)
                    const isToday =
                        d === currentDate.getDate() &&
                        month === currentDate.getMonth() &&
                        year === currentDate.getFullYear()

                    return (
                        <button
                            key={i}
                            onClick={() => handleDayClick(d)}
                            className={`relative py-1 rounded-xl flex flex-col items-center justify-center transition ${
                                isToday
                                    ? 'bg-neon-cyan text-black font-bold shadow-lg shadow-neon-cyan/50'
                                    : 'text-gray-300 hover:bg-white/10'
                            }`}
                        >
                            <span>{d}</span>
                            {dayEvents.length > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 animate-pulse" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Day Events Modal (Portaled to document.body) */}
            {isEventModalOpen && selectedDay && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <h3 className="text-sm font-bold text-white">
                                Events for {selectedDateStr}
                            </h3>
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Existing Events List */}
                        <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                            {selectedDayEvents.map((evt) => (
                                <div
                                    key={evt.id}
                                    className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white"
                                >
                                    <div className="min-w-0 pr-2">
                                        <div className="font-semibold truncate">{evt.title}</div>
                                        {evt.timeStr && (
                                            <div className="text-[10px] text-gray-400">
                                                Time: {evt.timeStr}
                                                {evt.reminderOffsetMinutes !== undefined && evt.reminderOffsetMinutes >= 0 && (
                                                    <span className="text-amber-400 ml-1">
                                                        (Reminder set)
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteEvent(evt.id)}
                                        className="text-gray-500 hover:text-red-400 p-1"
                                        title="Delete event"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {selectedDayEvents.length === 0 && (
                                <div className="text-center text-gray-500 text-xs py-3">
                                    No events scheduled for this day.
                                </div>
                            )}
                        </div>

                        {/* Add Event Form */}
                        <form onSubmit={handleCreateEvent} className="space-y-3 pt-2 border-t border-white/10">
                            <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5 text-neon-cyan" /> Add New Event & Reminder
                            </div>

                            <input
                                type="text"
                                required
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                                placeholder="Event title (e.g. Meeting, Doctor)"
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={eventTime}
                                        onChange={(e) => setEventTime(e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-neon-cyan"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">Desktop Reminder</label>
                                    <select
                                        value={reminderOffset}
                                        onChange={(e) => setReminderOffset(Number(e.target.value))}
                                        className="w-full px-2 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-neon-cyan cursor-pointer"
                                    >
                                        <option value={-1}>None</option>
                                        <option value={0}>At event time</option>
                                        <option value={15}>15m before</option>
                                        <option value={60}>1h before</option>
                                        <option value={1440}>1d before</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/30 rounded-xl text-xs font-semibold transition"
                            >
                                Save Event & Reminder
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
