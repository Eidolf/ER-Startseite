import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, RotateCcw, Cookie, Move, Trash2, Maximize2, Search, FileText, Folder, ChevronDown, ChevronUp, AppWindow, ExternalLink, X, Pencil, Camera, Globe } from 'lucide-react'
import { ClockWidget } from './widgets/ClockWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import { CalendarWidget } from './widgets/CalendarWidget'
import { AppIcon } from './AppIcon'
import { AppData, WidgetDefaults } from '../types'
import { getJsonCookie, setJsonCookie, deleteCookie } from '../utils/cookieUtils'

const COOKIE_NAME = 'er_canvas_layout_v1'
const EMPTY_ARRAY: string[] = []

export interface CanvasWidget {
    id: string
    type: 'clock' | 'weather' | 'calendar' | 'search' | 'text' | 'app' | 'folder'
    title: string
    x: number
    y: number
    width: number
    height: number
    expandedHeight?: number
    customText?: string
    appId?: string
    appData?: AppData
    folderName?: string
    folderAppIds?: string[]
    folderApps?: AppData[]
    isExpanded?: boolean
    clockFormat24?: boolean
    clockShowSeconds?: boolean
    clockDateFormat?: 'full' | 'short' | 'none'
    clockTimezone?: string
    weatherLocation?: string
    weatherUnit?: 'c' | 'f'
}

const DEFAULT_WIDGETS: CanvasWidget[] = [
    { id: 'w-clock-1', type: 'clock', title: 'Clock', x: 40, y: 40, width: 280, height: 150, clockFormat24: true, clockShowSeconds: false, clockDateFormat: 'full' },
    { id: 'w-weather-1', type: 'weather', title: 'Weather', x: 340, y: 40, width: 280, height: 150, weatherLocation: 'Berlin', weatherUnit: 'c' },
    { id: 'w-calendar-1', type: 'calendar', title: 'Calendar', x: 640, y: 40, width: 300, height: 260 },
    { id: 'w-search-1', type: 'search', title: 'Search Bar', x: 40, y: 210, width: 580, height: 90 },
    { id: 'w-text-1', type: 'text', title: 'Personal Notes', x: 40, y: 320, width: 400, height: 180, customText: 'Welcome to your private free canvas dashboard! Drag and resize widgets, apps, and expandable folders anywhere.' },
]

interface FreeCanvasBoardProps {
    apps?: AppData[]
    hiddenAppIds?: string[]
    showHiddenApps?: boolean
    openInNewTab?: boolean
    widgetDefaults?: WidgetDefaults
}

interface HoverPreviewState {
    id: string
    name: string
    url: string
    x: number
    y: number
}

export function FreeCanvasBoard({ apps = [], hiddenAppIds = EMPTY_ARRAY, showHiddenApps = false, widgetDefaults }: FreeCanvasBoardProps) {
    const availableApps = useMemo(
        () => apps.filter((a) => !hiddenAppIds.includes(a.id) || showHiddenApps),
        [apps, hiddenAppIds, showHiddenApps]
    )
    const [widgets, setWidgets] = useState<CanvasWidget[]>(() => {
        const raw = getJsonCookie<CanvasWidget[]>(COOKIE_NAME, DEFAULT_WIDGETS)
        return raw.map((w) => {
            if (w.type === 'app' && w.appId) {
                const foundApp = apps.find((a) => a.id === w.appId)
                return { ...w, appData: foundApp || w.appData }
            }
            if (w.type === 'folder' && (w.folderAppIds || w.folderApps)) {
                const appIds = w.folderAppIds || w.folderApps?.map((a) => a.id) || []
                const foundFolderApps = apps.filter((a) => appIds.includes(a.id))
                return {
                    ...w,
                    folderAppIds: appIds,
                    folderApps: foundFolderApps.length > 0 ? foundFolderApps : w.folderApps,
                }
            }
            return w
        })
    })

    const [isSavedInCookie, setIsSavedInCookie] = useState(false)
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
    const [isAppPickerOpen, setIsAppPickerOpen] = useState(false)
    
    // Folder modal states
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [folderTitleInput, setFolderTitleInput] = useState('')
    const [selectedFolderAppIds, setSelectedFolderAppIds] = useState<string[]>([])

    // Clock modal states
    const [isClockModalOpen, setIsClockModalOpen] = useState(false)
    const [editingClockId, setEditingClockId] = useState<string | null>(null)
    const [clockFormat24Input, setClockFormat24Input] = useState(true)
    const [clockShowSecondsInput, setClockShowSecondsInput] = useState(false)
    const [clockDateFormatInput, setClockDateFormatInput] = useState<'full' | 'short' | 'none'>('full')
    const [clockTimezoneInput, setClockTimezoneInput] = useState('')
    const [clockTimezoneError, setClockTimezoneError] = useState<string | null>(null)

    // Weather modal states
    const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false)
    const [editingWeatherId, setEditingWeatherId] = useState<string | null>(null)
    const [weatherLocationInput, setWeatherLocationInput] = useState('Berlin')
    const [weatherUnitInput, setWeatherUnitInput] = useState<'c' | 'f'>('c')

    const [hoverPreview, setHoverPreview] = useState<HoverPreviewState | null>(null)
    const [previewMode, setPreviewMode] = useState<'iframe' | 'snapshot'>('iframe')
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
    const leaveTimerRef = useRef<NodeJS.Timeout | null>(null)

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

    useEffect(() => {
        if (apps.length > 0) {
            setWidgets((prev) => {
                let hasChanged = false
                const updated = prev.map((w) => {
                    if (w.type === 'app' && w.appId) {
                        const isHidden = hiddenAppIds.includes(w.appId) && !showHiddenApps
                        const foundApp = isHidden ? undefined : availableApps.find((a) => a.id === w.appId)
                        if (foundApp !== w.appData) {
                            hasChanged = true
                            return { ...w, appData: foundApp }
                        }
                    }
                    if (w.type === 'folder' && (w.folderAppIds || w.folderApps)) {
                        const rawAppIds = w.folderAppIds || w.folderApps?.map((a) => a.id) || []
                        const appIds = rawAppIds.filter((id) => !hiddenAppIds.includes(id) || showHiddenApps)
                        const foundFolderApps = availableApps.filter((a) => appIds.includes(a.id))
                        const folderAppsChanged =
                            foundFolderApps.length !== (w.folderApps?.length || 0) ||
                            foundFolderApps.some((a, idx) => a !== w.folderApps?.[idx])
                        if (folderAppsChanged) {
                            hasChanged = true
                            return {
                                ...w,
                                folderAppIds: appIds,
                                folderApps: foundFolderApps,
                            }
                        }
                    }
                    return w
                })
                return hasChanged ? updated : prev
            })
        }
    }, [apps, availableApps, hiddenAppIds, showHiddenApps])

    useEffect(() => {
        const leanWidgets = widgets.map((w) => ({
            id: w.id,
            type: w.type,
            title: w.title,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            expandedHeight: w.expandedHeight,
            customText: w.customText,
            appId: w.appId,
            folderName: w.folderName,
            folderAppIds: w.folderAppIds || w.folderApps?.map((a) => a.id),
            isExpanded: w.isExpanded,
            clockFormat24: w.clockFormat24,
            clockShowSeconds: w.clockShowSeconds,
            clockDateFormat: w.clockDateFormat,
            clockTimezone: w.clockTimezone,
            weatherLocation: w.weatherLocation,
            weatherUnit: w.weatherUnit,
        }))
        setJsonCookie(COOKIE_NAME, leanWidgets)
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
        if (!widget || widget.isExpanded === false) return

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
                prev.map((w) =>
                    w.id === resizingId
                        ? { ...w, width: newWidth, height: newHeight, expandedHeight: newHeight }
                        : w
                )
            )
        }
    }

    const handleMouseUp = () => {
        setDraggingId(null)
        setResizingId(null)
    }

    const addWidget = (type: CanvasWidget['type'], extra?: Partial<CanvasWidget>) => {
        const id = `w-${type}-${Date.now()}`
        const titles: Record<CanvasWidget['type'], string> = {
            clock: 'Clock',
            weather: 'Weather',
            calendar: 'Calendar',
            search: 'Search Bar',
            text: 'Note',
            app: extra?.title || 'App Shortcut',
            folder: extra?.title || 'Folder Container',
        }
        const defaults: Record<CanvasWidget['type'], { width: number; height: number }> = {
            clock: { width: 280, height: 150 },
            weather: { width: 280, height: 150 },
            calendar: { width: 300, height: 260 },
            search: { width: 500, height: 90 },
            text: { width: 360, height: 160 },
            app: { width: 200, height: 120 },
            folder: { width: 380, height: 240 },
        }

        const newWidget: CanvasWidget = {
            id,
            type,
            title: titles[type],
            x: 60 + (widgets.length % 5) * 40,
            y: 60 + (widgets.length % 5) * 40,
            width: defaults[type].width,
            height: defaults[type].height,
            expandedHeight: defaults[type].height,
            customText: type === 'text' ? 'Write your note here...' : undefined,
            isExpanded: type === 'folder' ? true : undefined,
            clockFormat24: widgetDefaults?.clockFormat ? widgetDefaults.clockFormat !== '12h' : true,
            clockShowSeconds: false,
            clockDateFormat: widgetDefaults?.dateFormat === 'none' ? 'none' : widgetDefaults?.dateFormat === 'short' ? 'short' : 'full',
            weatherLocation: widgetDefaults?.weatherLocation || 'Berlin',
            weatherUnit: widgetDefaults?.weatherUnit || 'c',
            ...extra,
        }

        setWidgets((prev) => [...prev, newWidget])
        setIsAddMenuOpen(false)
    }

    const handleSelectAppForCanvas = (app: AppData) => {
        addWidget('app', {
            title: app.name,
            appId: app.id,
            appData: app,
        })
        setIsAppPickerOpen(false)
    }

    // Handlers for Folder Editing
    const handleOpenEditFolder = (widget: CanvasWidget) => {
        setEditingFolderId(widget.id)
        setFolderTitleInput(widget.folderName || widget.title)
        setSelectedFolderAppIds(widget.folderAppIds || widget.folderApps?.map((a) => a.id) || [])
        setIsFolderModalOpen(true)
    }

    const handleCreateOrUpdateFolder = () => {
        if (!folderTitleInput.trim()) return
        const folderApps = apps.filter((a) => selectedFolderAppIds.includes(a.id))

        if (editingFolderId) {
            setWidgets((prev) =>
                prev.map((w) =>
                    w.id === editingFolderId
                        ? {
                              ...w,
                              title: folderTitleInput.trim(),
                              folderName: folderTitleInput.trim(),
                              folderAppIds: selectedFolderAppIds,
                              folderApps,
                          }
                        : w
                )
            )
        } else {
            addWidget('folder', {
                title: folderTitleInput.trim(),
                folderName: folderTitleInput.trim(),
                folderAppIds: selectedFolderAppIds,
                folderApps,
                isExpanded: true,
                width: 380,
                height: 240,
                expandedHeight: 240,
            })
        }

        setEditingFolderId(null)
        setFolderTitleInput('')
        setSelectedFolderAppIds([])
        setIsFolderModalOpen(false)
    }

    // Handlers for Clock Editing
    const handleOpenEditClock = (widget: CanvasWidget) => {
        setEditingClockId(widget.id)
        setClockFormat24Input(widget.clockFormat24 !== false)
        setClockShowSecondsInput(!!widget.clockShowSeconds)
        setClockDateFormatInput(widget.clockDateFormat || 'full')
        setClockTimezoneInput(widget.clockTimezone || '')
        setClockTimezoneError(null)
        setIsClockModalOpen(true)
    }

    const handleSaveClockSettings = () => {
        if (!editingClockId) return
        const trimmed = clockTimezoneInput.trim()
        if (trimmed) {
            try {
                Intl.DateTimeFormat(undefined, { timeZone: trimmed })
            } catch {
                setClockTimezoneError('Invalid IANA timezone (e.g. Europe/Berlin, UTC)')
                return
            }
        }
        setClockTimezoneError(null)
        setWidgets((prev) =>
            prev.map((w) =>
                w.id === editingClockId
                    ? {
                          ...w,
                          clockFormat24: clockFormat24Input,
                          clockShowSeconds: clockShowSecondsInput,
                          clockDateFormat: clockDateFormatInput,
                          clockTimezone: trimmed || undefined,
                      }
                    : w
            )
        )
        setEditingClockId(null)
        setIsClockModalOpen(false)
    }

    // Handlers for Weather Editing
    const handleOpenEditWeather = (widget: CanvasWidget) => {
        setEditingWeatherId(widget.id)
        setWeatherLocationInput(widget.weatherLocation || 'Berlin')
        setWeatherUnitInput(widget.weatherUnit || 'c')
        setIsWeatherModalOpen(true)
    }

    const handleSaveWeatherSettings = () => {
        if (!editingWeatherId) return
        setWidgets((prev) =>
            prev.map((w) =>
                w.id === editingWeatherId
                    ? {
                          ...w,
                          weatherLocation: weatherLocationInput.trim() || 'Berlin',
                          weatherUnit: weatherUnitInput,
                      }
                    : w
            )
        )
        setEditingWeatherId(null)
        setIsWeatherModalOpen(false)
    }

    const toggleFolderExpanded = (id: string) => {
        setWidgets((prev) =>
            prev.map((w) => {
                if (w.id !== id) return w
                const isCurrentlyExpanded = w.isExpanded !== false
                if (isCurrentlyExpanded) {
                    return {
                        ...w,
                        isExpanded: false,
                        expandedHeight: w.height > 52 ? w.height : w.expandedHeight || 240,
                        height: 52,
                    }
                } else {
                    return {
                        ...w,
                        isExpanded: true,
                        height: w.expandedHeight || 240,
                    }
                }
            })
        )
    }

    const removeWidget = (id: string) => {
        setWidgets((prev) => prev.filter((w) => w.id !== id))
    }

    const resetLayout = () => {
        deleteCookie(COOKIE_NAME)
        setWidgets(DEFAULT_WIDGETS)
        setIsAddMenuOpen(false)
    }

    const updateNoteText = (id: string, text: string) => {
        setWidgets((prev) =>
            prev.map((w) => (w.id === id ? { ...w, customText: text } : w))
        )
    }

    const launchCanvasApp = (url?: string) => {
        if (!url) return
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleAppMouseEnter = (id: string, name: string, url?: string, e?: React.MouseEvent) => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return

        const posX = e ? Math.max(10, Math.min(e.clientX + 15, window.innerWidth - 440)) : 100
        const posY = e ? Math.max(10, Math.min(e.clientY + 15, window.innerHeight - 300)) : 100

        hoverTimerRef.current = setTimeout(() => {
            setHoverPreview({
                id,
                name,
                url,
                x: posX,
                y: posY,
            })
        }, 2000)
    }

    const handleAppMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        leaveTimerRef.current = setTimeout(() => {
            setHoverPreview(null)
        }, 300)
    }

    const handlePopupMouseEnter = () => {
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }

    const handlePopupMouseLeave = () => {
        setHoverPreview(null)
    }

    return (
        <div
            ref={boardRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full p-6 select-none"
        >
            {/* Click-outside backdrop for dropdown */}
            {isAddMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsAddMenuOpen(false)}
                />
            )}

            {/* Top Toolbar */}
            <div className="relative z-50 flex flex-wrap items-center justify-between gap-4 mb-6 bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                        <Move className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide">Free Canvas Board</h2>
                        <p className="text-xs text-gray-400">
                            Freely position & resize widgets, apps, and expandable folders. Saved in your browser cookies.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Cookie indicator */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                        <Cookie className="w-4 h-4 text-amber-400" />
                        <span>{isSavedInCookie ? 'Cookie Persisted' : 'Saving...'}</span>
                    </div>

                    {/* Add Menu Options */}
                    <div className="relative">
                        <button
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-indigo-600/30"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add to Canvas</span>
                        </button>
                        {isAddMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Widgets
                                </div>
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

                                <div className="h-px bg-white/10 my-1.5" />
                                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Shortcuts & Containers
                                </div>
                                <button
                                    onClick={() => {
                                        setIsAddMenuOpen(false)
                                        setIsAppPickerOpen(true)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                                >
                                    <AppWindow className="w-4 h-4 text-cyan-400" /> App Shortcut
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAddMenuOpen(false)
                                        setIsFolderModalOpen(true)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                                >
                                    <Folder className="w-4 h-4 text-amber-400" /> Expandable Folder
                                </button>
                            </div>
                        )}
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
                {widgets.map((widget) => {
                    if (widget.type === 'app' && widget.appId && hiddenAppIds.includes(widget.appId) && !showHiddenApps) {
                        return null
                    }
                    return (
                        <div
                        key={widget.id}
                        style={{
                            position: 'absolute',
                            left: `${widget.x}px`,
                            top: `${widget.y}px`,
                            width: `${widget.width}px`,
                            height: `${widget.isExpanded === false ? 52 : widget.height}px`,
                        }}
                        className={`group rounded-2xl transition-all duration-200 ${
                            draggingId === widget.id ? 'z-50 shadow-2xl ring-2 ring-indigo-500' : 'z-10'
                        }`}
                    >
                        {/* Widget Control Header Overlay */}
                        <div
                            onMouseDown={(e) => handleMouseDown(e, widget.id)}
                            className="absolute top-0 left-0 right-0 h-8 bg-black/60 backdrop-blur-md rounded-t-2xl border-b border-white/10 px-3 flex items-center justify-between cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 truncate">
                                <Move className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate">{widget.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {widget.type === 'clock' && (
                                    <button
                                        onClick={() => handleOpenEditClock(widget)}
                                        className="text-gray-400 hover:text-cyan-400 p-1 rounded transition"
                                        title="Configure Clock Settings"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {widget.type === 'weather' && (
                                    <button
                                        onClick={() => handleOpenEditWeather(widget)}
                                        className="text-gray-400 hover:text-yellow-400 p-1 rounded transition"
                                        title="Configure Weather Location"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {widget.type === 'folder' && (
                                    <>
                                        <button
                                            onClick={() => handleOpenEditFolder(widget)}
                                            className="text-gray-400 hover:text-amber-400 p-1 rounded transition"
                                            title="Edit Folder Apps"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => toggleFolderExpanded(widget.id)}
                                            className="text-gray-400 hover:text-white p-1 rounded transition"
                                            title={widget.isExpanded === false ? 'Expand Folder' : 'Collapse Folder'}
                                        >
                                            {widget.isExpanded === false ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => removeWidget(widget.id)}
                                    className="text-gray-400 hover:text-red-400 p-1 rounded transition"
                                    title="Remove item"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Widget Body Content */}
                        <div className="w-full h-full pt-1">
                            {widget.type === 'clock' && (
                                <ClockWidget
                                    is24Hour={widget.clockFormat24 !== false}
                                    showSeconds={!!widget.clockShowSeconds}
                                    dateFormat={widget.clockDateFormat || 'full'}
                                    timeZone={widget.clockTimezone}
                                />
                            )}
                            {widget.type === 'weather' && (
                                <WeatherWidget
                                    location={widget.weatherLocation || 'Berlin'}
                                    unit={widget.weatherUnit || 'c'}
                                />
                            )}
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
                            {widget.type === 'app' && (
                                <div
                                    onClick={() => launchCanvasApp(widget.appData?.url)}
                                    onMouseEnter={(e) => handleAppMouseEnter(widget.id, widget.title, widget.appData?.url, e)}
                                    onMouseLeave={handleAppMouseLeave}
                                    className="w-full h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 transition group/app shadow-lg"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white/5 p-2 mb-2 flex items-center justify-center shrink-0">
                                        <AppIcon src={widget.appData?.icon_url} alt={widget.title} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-sm font-semibold text-white truncate w-full px-1">{widget.title}</span>
                                    {widget.appData?.url && (
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 truncate max-w-full">
                                            <ExternalLink className="w-2.5 h-2.5" /> New Tab
                                        </span>
                                    )}
                                </div>
                            )}
                            {widget.type === 'folder' && (
                                <div className="w-full h-full bg-black/50 backdrop-blur-xl rounded-2xl border border-amber-500/20 p-3 flex flex-col shadow-2xl overflow-hidden">
                                    {/* Header line only when collapsed */}
                                    <div className="flex items-center justify-between h-8 shrink-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                                            <span className="font-bold text-white text-sm truncate">{widget.folderName || widget.title}</span>
                                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full shrink-0">
                                                {widget.folderApps?.length || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleOpenEditFolder(widget)}
                                                className="text-gray-400 hover:text-amber-400 p-1 rounded-lg hover:bg-white/10 transition"
                                                title="Edit Folder Apps"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => toggleFolderExpanded(widget.id)}
                                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                                                title={widget.isExpanded === false ? 'Expand Folder' : 'Collapse Folder'}
                                            >
                                                {widget.isExpanded === false ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Folder Content (Visible when expanded) */}
                                    {widget.isExpanded !== false && (
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto p-1 mt-2 border-t border-white/10 pt-2">
                                            {widget.folderApps?.map((app) => (
                                                <div
                                                    key={app.id}
                                                    onClick={() => launchCanvasApp(app.url)}
                                                    onMouseEnter={(e) => handleAppMouseEnter(app.id, app.name, app.url, e)}
                                                    onMouseLeave={handleAppMouseLeave}
                                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 transition cursor-pointer group/folderapp"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-black/20 p-1 mb-1 flex items-center justify-center">
                                                        <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="text-xs text-gray-200 truncate w-full text-center">{app.name}</span>
                                                </div>
                                            ))}
                                            {(!widget.folderApps || widget.folderApps.length === 0) && (
                                                <div className="col-span-full flex items-center justify-center text-xs text-gray-500 italic py-4">
                                                    Empty Folder Container
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Resize handle (Hidden when folder is collapsed) */}
                        {widget.isExpanded !== false && (
                            <div
                                onMouseDown={(e) => handleResizeMouseDown(e, widget.id)}
                                className="absolute bottom-1 right-1 p-1 text-gray-400 hover:text-white cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                title="Resize item"
                            >
                                <Maximize2 className="w-3.5 h-3.5 rotate-90" />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>

            {/* Dual Mode Web Preview Modal (Image Snapshot & Sandboxed Iframe) */}
            {hoverPreview && (
                <div
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                    style={{
                        position: 'fixed',
                        left: `${hoverPreview.x}px`,
                        top: `${hoverPreview.y}px`,
                    }}
                    className="z-[200] w-[420px] h-[280px] bg-slate-900/95 border border-indigo-500/50 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
                >
                    <div className="px-3 py-1.5 bg-black/80 border-b border-white/10 flex items-center justify-between text-xs text-gray-300 font-semibold shrink-0">
                        <div className="flex items-center gap-1.5 truncate">
                            <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="truncate">{hoverPreview.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPreviewMode('snapshot')}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition flex items-center gap-1 ${
                                    previewMode === 'snapshot'
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Camera className="w-3 h-3" /> Image
                            </button>
                            <button
                                onClick={() => setPreviewMode('iframe')}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition flex items-center gap-1 ${
                                    previewMode === 'iframe'
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Globe className="w-3 h-3" /> Live
                            </button>
                        </div>
                    </div>
                    <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center">
                        {previewMode === 'snapshot' ? (
                            <img
                                src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(hoverPreview.url)}?w=600&h=400`}
                                alt={`Snapshot preview of ${hoverPreview.name}`}
                                onError={(e) => {
                                    // Fallback to thum.io snapshot service if needed
                                    const target = e.target as HTMLImageElement
                                    target.src = `https://image.thum.io/get/width/600/crop/400/${hoverPreview.url}`
                                }}
                                className="w-full h-full object-cover opacity-95"
                            />
                        ) : (
                            <iframe
                                src={hoverPreview.url}
                                title={`Preview of ${hoverPreview.name}`}
                                sandbox="allow-scripts allow-forms allow-same-origin"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="w-[133.3%] h-[133.3%] border-0 pointer-events-none opacity-95 scale-[0.75] origin-top-left absolute inset-0"
                            />
                        )}
                        <div className="absolute bottom-2 left-2 right-2 p-1.5 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-between text-[10px] text-gray-300 z-10 pointer-events-none">
                            <span className="truncate">{hoverPreview.url}</span>
                            <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0 ml-1" />
                        </div>
                    </div>
                </div>
            )}

            {/* Clock Settings Configuration Modal */}
            {isClockModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Configure Clock Settings</h3>
                            <button onClick={() => setIsClockModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Timezone (e.g. Europe/Berlin, UTC, America/New_York)</label>
                                <input
                                    type="text"
                                    value={clockTimezoneInput}
                                    onChange={(e) => setClockTimezoneInput(e.target.value)}
                                    placeholder="Leave empty for local timezone"
                                    className={`w-full px-3 py-2 bg-black/40 border ${clockTimezoneError ? 'border-red-500' : 'border-white/10'} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm`}
                                />
                                {clockTimezoneError && <p className="text-xs text-red-400 mt-1">{clockTimezoneError}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">Time Format</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setClockFormat24Input(true)}
                                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                                            clockFormat24Input
                                                ? 'bg-cyan-500 border-cyan-400 text-black'
                                                : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        24-Hour (14:30)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClockFormat24Input(false)}
                                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                                            !clockFormat24Input
                                                ? 'bg-cyan-500 border-cyan-400 text-black'
                                                : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        12-Hour (02:30 PM)
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-white/10">
                                <span className="text-xs font-medium text-gray-300">Display Seconds</span>
                                <input
                                    type="checkbox"
                                    checked={clockShowSecondsInput}
                                    onChange={(e) => setClockShowSecondsInput(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">Date Format</label>
                                <select
                                    value={clockDateFormatInput}
                                    onChange={(e) => setClockDateFormatInput(e.target.value as 'full' | 'short' | 'none')}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none text-sm"
                                >
                                    <option value="full">Full (Saturday, 25 Jul)</option>
                                    <option value="short">Short (25 Jul)</option>
                                    <option value="none">Hidden</option>
                                </select>
                            </div>

                            <button
                                onClick={handleSaveClockSettings}
                                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-sm transition shadow-lg shadow-cyan-500/20"
                            >
                                Save Clock Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Weather Location Configuration Modal */}
            {isWeatherModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Configure Weather Location</h3>
                            <button onClick={() => setIsWeatherModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">City / Location</label>
                                <input
                                    type="text"
                                    value={weatherLocationInput}
                                    onChange={(e) => setWeatherLocationInput(e.target.value)}
                                    placeholder="e.g. Berlin, Munich, Frankfurt"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">Temperature Unit</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setWeatherUnitInput('c')}
                                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                                            weatherUnitInput === 'c'
                                                ? 'bg-yellow-500 border-yellow-400 text-black'
                                                : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Celsius (°C)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWeatherUnitInput('f')}
                                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition border ${
                                            weatherUnitInput === 'f'
                                                ? 'bg-yellow-500 border-yellow-400 text-black'
                                                : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Fahrenheit (°F)
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveWeatherSettings}
                                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition shadow-lg shadow-yellow-500/20"
                            >
                                Save Weather Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* App Picker Modal */}
            {isAppPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Select App for Canvas</h3>
                            <button onClick={() => setIsAppPickerOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {availableApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleSelectAppForCanvas(app)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition border border-white/5 text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-black/30 p-1 flex items-center justify-center shrink-0">
                                        <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-white truncate">{app.name}</div>
                                        {app.url && <div className="text-xs text-gray-400 truncate">{app.url}</div>}
                                    </div>
                                </button>
                            ))}
                            {availableApps.length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-6">No applications available.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Creator & Editor Modal */}
            {isFolderModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">
                                {editingFolderId ? 'Edit Canvas Folder Container' : 'Create Canvas Folder Container'}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsFolderModalOpen(false)
                                    setEditingFolderId(null)
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Folder Name</label>
                                <input
                                    type="text"
                                    value={folderTitleInput}
                                    onChange={(e) => setFolderTitleInput(e.target.value)}
                                    placeholder="e.g. Media Tools"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-2">Select Included Apps</label>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/10 rounded-xl p-2 bg-black/20">
                                    {availableApps.map((app) => {
                                        const isSelected = selectedFolderAppIds.includes(app.id)
                                        return (
                                            <button
                                                key={app.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFolderAppIds((prev) =>
                                                        isSelected ? prev.filter((id) => id !== app.id) : [...prev, app.id]
                                                    )
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition ${
                                                    isSelected ? 'bg-amber-500/20 border border-amber-500/40 text-white' : 'hover:bg-white/5 text-gray-300'
                                                }`}
                                            >
                                                <div className="w-6 h-6 rounded bg-black/30 p-0.5 flex items-center justify-center shrink-0">
                                                    <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-xs font-medium truncate flex-1">{app.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateOrUpdateFolder}
                                disabled={!folderTitleInput.trim()}
                                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
                            >
                                {editingFolderId ? 'Save Changes' : 'Create Folder Container'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
