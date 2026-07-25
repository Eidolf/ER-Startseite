import React, { useState, useEffect, useRef } from 'react'
import { Plus, RotateCcw, Cookie, Move, Trash2, Maximize2, Search, FileText } from 'lucide-react'
import { ClockWidget } from './widgets/ClockWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import { CalendarWidget } from './widgets/CalendarWidget'
import { getJsonCookie, setJsonCookie, deleteCookie } from '../utils/cookieUtils'

const COOKIE_NAME = 'er_canvas_layout_v1'

export interface CanvasWidget {
    id: string
    type: 'clock' | 'weather' | 'calendar' | 'search' | 'text'
    title: string
    x: number
    y: number
    width: number
    height: number
    customText?: string
}

const DEFAULT_WIDGETS: CanvasWidget[] = [
    { id: 'w-clock-1', type: 'clock', title: 'Clock', x: 40, y: 40, width: 280, height: 150 },
    { id: 'w-weather-1', type: 'weather', title: 'Weather', x: 340, y: 40, width: 280, height: 150 },
    { id: 'w-calendar-1', type: 'calendar', title: 'Calendar', x: 640, y: 40, width: 300, height: 260 },
    { id: 'w-search-1', type: 'search', title: 'Search Bar', x: 40, y: 210, width: 580, height: 90 },
    { id: 'w-text-1', type: 'text', title: 'Personal Notes', x: 40, y: 320, width: 400, height: 180, customText: 'Welcome to your private free canvas dashboard! Drag and resize widgets anywhere.' },
]

export function FreeCanvasBoard() {
    const [widgets, setWidgets] = useState<CanvasWidget[]>(() => {
        return getJsonCookie<CanvasWidget[]>(COOKIE_NAME, DEFAULT_WIDGETS)
    })
    const [isSavedInCookie, setIsSavedInCookie] = useState(false)
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [resizingId, setResizingId] = useState<string | null>(null)
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const initialSize = useRef<{ width: number; height: number; mouseX: number; mouseY: number }>({
        width: 0,
        height: 0,
        mouseX: 0,
        mouseY: 0,
    })
    const boardRef = useRef<HTMLDivElement>(null)

    // Save to cookies on layout changes
    useEffect(() => {
        setJsonCookie(COOKIE_NAME, widgets)
        setIsSavedInCookie(true)
    }, [widgets])

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        const widget = widgets.find((w) => w.id === id)
        if (!widget) return

        setDraggingId(id)
        dragOffset.current = {
            x: e.clientX - widget.x,
            y: e.clientY - widget.y,
        }
    }

    const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        const widget = widgets.find((w) => w.id === id)
        if (!widget) return

        setResizingId(id)
        initialSize.current = {
            width: widget.width,
            height: widget.height,
            mouseX: e.clientX,
            mouseY: e.clientY,
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId) {
            const rawX = e.clientX - dragOffset.current.x
            const rawY = e.clientY - dragOffset.current.y
            // Snap to 10px grid, constrain positive
            const snappedX = Math.max(10, Math.round(rawX / 10) * 10)
            const snappedY = Math.max(10, Math.round(rawY / 10) * 10)

            setWidgets((prev) =>
                prev.map((w) => (w.id === draggingId ? { ...w, x: snappedX, y: snappedY } : w))
            )
        } else if (resizingId) {
            const deltaX = e.clientX - initialSize.current.mouseX
            const deltaY = e.clientY - initialSize.current.mouseY

            const newWidth = Math.max(180, Math.round((initialSize.current.width + deltaX) / 10) * 10)
            const newHeight = Math.max(80, Math.round((initialSize.current.height + deltaY) / 10) * 10)

            setWidgets((prev) =>
                prev.map((w) => (w.id === resizingId ? { ...w, width: newWidth, height: newHeight } : w))
            )
        }
    }

    const handleMouseUp = () => {
        setDraggingId(null)
        setResizingId(null)
    }

    const addWidget = (type: CanvasWidget['type']) => {
        const id = `w-${type}-${Date.now()}`
        const titles: Record<CanvasWidget['type'], string> = {
            clock: 'Clock',
            weather: 'Weather',
            calendar: 'Calendar',
            search: 'Search Bar',
            text: 'Note',
        }
        const defaults: Record<CanvasWidget['type'], { width: number; height: number }> = {
            clock: { width: 280, height: 150 },
            weather: { width: 280, height: 150 },
            calendar: { width: 300, height: 260 },
            search: { width: 500, height: 90 },
            text: { width: 360, height: 160 },
        }

        const newWidget: CanvasWidget = {
            id,
            type,
            title: titles[type],
            x: 60 + (widgets.length % 5) * 40,
            y: 60 + (widgets.length % 5) * 40,
            width: defaults[type].width,
            height: defaults[type].height,
            customText: type === 'text' ? 'Write your note here...' : undefined,
        }

        setWidgets((prev) => [...prev, newWidget])
    }

    const removeWidget = (id: string) => {
        setWidgets((prev) => prev.filter((w) => w.id !== id))
    }

    const resetLayout = () => {
        deleteCookie(COOKIE_NAME)
        setWidgets(DEFAULT_WIDGETS)
    }

    const updateNoteText = (id: string, text: string) => {
        setWidgets((prev) =>
            prev.map((w) => (w.id === id ? { ...w, customText: text } : w))
        )
    }

    return (
        <div
            ref={boardRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full min-h-[calc(100vh-100px)] p-6 select-none overflow-auto"
        >
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                        <Move className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide">Free Canvas Board</h2>
                        <p className="text-xs text-gray-400">
                            Freely position & resize widgets. Saved in your browser cookies.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Cookie indicator */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                        <Cookie className="w-4 h-4 text-amber-400" />
                        <span>{isSavedInCookie ? 'Cookie Persisted' : 'Saving...'}</span>
                    </div>

                    {/* Add Widget Options */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-indigo-600/30">
                            <Plus className="w-4 h-4" />
                            <span>Add Widget</span>
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50">
                            <button
                                onClick={() => addWidget('clock')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Clock Widget
                            </button>
                            <button
                                onClick={() => addWidget('weather')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-yellow-400" /> Weather Widget
                            </button>
                            <button
                                onClick={() => addWidget('calendar')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Calendar Widget
                            </button>
                            <button
                                onClick={() => addWidget('search')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-indigo-400" /> Search Bar
                            </button>
                            <button
                                onClick={() => addWidget('text')}
                                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-pink-400" /> Custom Note
                            </button>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={resetLayout}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm font-medium transition"
                        title="Reset canvas to default layout"
                    >
                        <RotateCcw className="w-4 h-4 text-gray-400" />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="relative w-full min-h-[750px] rounded-3xl bg-black/20 border border-white/5 backdrop-blur-sm overflow-hidden p-4">
                {widgets.map((widget) => (
                    <div
                        key={widget.id}
                        style={{
                            position: 'absolute',
                            left: `${widget.x}px`,
                            top: `${widget.y}px`,
                            width: `${widget.width}px`,
                            height: `${widget.height}px`,
                        }}
                        className={`group rounded-2xl transition-shadow ${
                            draggingId === widget.id ? 'z-50 shadow-2xl ring-2 ring-indigo-500' : 'z-10'
                        }`}
                    >
                        {/* Widget Control Header Overlay */}
                        <div
                            onMouseDown={(e) => handleMouseDown(e, widget.id)}
                            className="absolute top-0 left-0 right-0 h-8 bg-black/60 backdrop-blur-md rounded-t-2xl border-b border-white/10 px-3 flex items-center justify-between cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                                <Move className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{widget.title}</span>
                            </div>
                            <button
                                onClick={() => removeWidget(widget.id)}
                                className="text-gray-400 hover:text-red-400 p-1 rounded transition"
                                title="Remove widget"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Widget Body Content */}
                        <div className="w-full h-full pt-1">
                            {widget.type === 'clock' && <ClockWidget />}
                            {widget.type === 'weather' && <WeatherWidget />}
                            {widget.type === 'calendar' && <CalendarWidget />}
                            {widget.type === 'search' && (
                                <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex items-center gap-3">
                                    <Search className="w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search the web or apps..."
                                        className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const target = e.target as HTMLInputElement
                                                if (target.value.trim()) {
                                                    window.open(`https://www.google.com/search?q=${encodeURIComponent(target.value)}`, '_blank')
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            )}
                            {widget.type === 'text' && (
                                <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-xs text-pink-400 font-semibold">
                                        <FileText className="w-4 h-4" /> Note
                                    </div>
                                    <textarea
                                        value={widget.customText || ''}
                                        onChange={(e) => updateNoteText(widget.id, e.target.value)}
                                        placeholder="Type your notes..."
                                        className="w-full h-full bg-transparent text-gray-200 text-sm focus:outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Resize handle */}
                        <div
                            onMouseDown={(e) => handleResizeMouseDown(e, widget.id)}
                            className="absolute bottom-1 right-1 p-1 text-gray-400 hover:text-white cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            title="Resize widget"
                        >
                            <Maximize2 className="w-3.5 h-3.5 rotate-90" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
