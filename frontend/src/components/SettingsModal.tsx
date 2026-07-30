import React, { useRef, useState, useEffect } from 'react'
import { X, Upload, Trash2, Sparkles, Film, Palette, Monitor, ExternalLink, Github, LayoutGrid, Clock, CloudSun, Save, LogOut, Terminal, RefreshCw } from 'lucide-react'
import { BackgroundConfig, LogoConfig, IconConfig, TitleConfig, WidgetData, LayoutMode, WidgetDefaults } from '../types'
import { useMonitoring } from './monitoring/useMonitoring'

interface LogEntry {
    timestamp: string
    level: string
    message: string
    details?: Record<string, unknown>
}

function SystemLogsViewer() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [minLevel, setMinLevel] = useState<string>('DEBUG')
    const [loading, setLoading] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchLogs = React.useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/v1/system/logs?min_level=${minLevel}&limit=150`)
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs || [])
            }
        } catch {
            // ignore network errors
        } finally {
            setLoading(false)
        }
    }, [minLevel])

    const clearLogs = async () => {
        if (!window.confirm('System-Logs wirklich löschen?')) return
        try {
            await fetch('/api/v1/system/logs', { method: 'DELETE' })
            setLogs([])
        } catch {
            // ignore
        }
    }

    useEffect(() => {
        fetchLogs()
        if (!autoRefresh) return
        const interval = setInterval(fetchLogs, 3000)
        return () => clearInterval(interval)
    }, [fetchLogs, autoRefresh])

    const getLevelBadgeClass = (lvl: string) => {
        switch (lvl.upperCase ? lvl.upperCase() : String(lvl).toUpperCase()) {
            case 'ERROR':
                return 'bg-red-500/20 text-red-400 border-red-500/30'
            case 'WARNING':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'INFO':
                return 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30'
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-neon-cyan" />
                    <h3 className="text-sm font-semibold text-white">System & Collector Live Logs</h3>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={minLevel}
                        onChange={(e) => setMinLevel(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-black/40 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-neon-cyan"
                    >
                        <option value="DEBUG">Min Level: DEBUG</option>
                        <option value="INFO">Min Level: INFO</option>
                        <option value="WARNING">Min Level: WARNING</option>
                        <option value="ERROR">Min Level: ERROR</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                            autoRefresh ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-black/20 border-white/10 text-gray-400'
                        }`}
                    >
                        {autoRefresh ? 'Auto 3s: ON' : 'Auto: OFF'}
                    </button>

                    <button
                        type="button"
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition"
                        title="Jetzt aktualisieren"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-neon-cyan' : ''}`} />
                    </button>

                    <button
                        type="button"
                        onClick={clearLogs}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition"
                        title="Logs leeren"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="h-96 overflow-y-auto custom-scrollbar p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs space-y-2">
                {logs.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">Keine Logs in der aktuellen Ansicht vorhanden...</div>
                ) : (
                    logs.map((entry, idx) => (
                        <div key={idx} className="p-2 rounded bg-white/[0.02] border border-white/5 space-y-1 hover:bg-white/[0.05] transition">
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${getLevelBadgeClass(entry.level)}`}>
                                    {entry.level}
                                </span>
                            </div>
                            <div className="text-gray-200 font-semibold">{entry.message}</div>
                            {entry.details && Object.keys(entry.details).length > 0 && (
                                <pre className="text-[10px] text-gray-400 bg-black/40 p-1.5 rounded overflow-x-auto">
                                    {JSON.stringify(entry.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

interface MediaItem {
    name: string
    url: string
    type: 'image' | 'video'
}

const getStrength = (pass: string) => {
    let score = 0
    if (pass.length > 7) score++
    if (pass.length > 11) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++
    return score
}

const getStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500'
    if (score < 4) return 'bg-yellow-500'
    return 'bg-green-500'
}

const getStrengthLabel = (score: number) => {
    if (score < 2) return 'Very Weak'
    if (score < 4) return 'Medium'
    return 'Strong'
}

function ChangePasswordForm() {
    const [oldPass, setOldPass] = useState('')
    const [newPass, setNewPass] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [loading, setLoading] = useState(false)

    const strength = getStrength(newPass)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPass !== confirmPass) return alert("Passwords do not match")
        if (newPass.length < 4) return alert("New password too short")

        setLoading(true)
        try {
            const res = await fetch('/api/v1/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: oldPass, new_password: newPass })
            })
            if (res.ok) {
                alert("Password changed successfully")
                setOldPass('')
                setNewPass('')
                setConfirmPass('')
            } else {
                alert("Failed to change password. Check old password.")
            }
        } catch {
            alert("Error changing password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Current Password"
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-neon-cyan outline-none placeholder:text-gray-500"
            />

            <div className="space-y-1">
                <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="New Password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-neon-cyan outline-none placeholder:text-gray-500"
                />
                {newPass.length > 0 && (
                    <div className="flex items-center gap-2 px-1 pt-1">
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${getStrengthColor(strength)}`}
                                style={{ width: `${(strength / 5) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 min-w-[50px] text-right">
                            {getStrengthLabel(strength)}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-neon-cyan outline-none placeholder:text-gray-500"
                />
                {newPass !== confirmPass && confirmPass.length > 0 && (
                    <p className="text-red-400 text-[10px] animate-pulse px-1">Passwords do not match</p>
                )}
            </div>

            <button
                type="submit"
                disabled={loading || newPass !== confirmPass || newPass.length < 4}
                className="w-full py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    )
}

function MediaLibrary({ onSelect }: { onSelect: (url: string, type: string) => void }) {
    const [media, setMedia] = useState<MediaItem[]>([])
    const [loading, setLoading] = useState(true)

    const fetchMedia = async () => {
        try {
            const res = await fetch('/api/v1/media')
            if (res.ok) {
                const data = await res.json()
                setMedia(data)
            }
        } catch (e) {
            console.error("Failed to fetch media", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMedia()
    }, [])

    const handleDelete = async (e: React.MouseEvent, filename: string) => {
        e.stopPropagation()
        if (!confirm('Delete this file?')) return

        try {
            const res = await fetch(`/api/v1/media/${filename}`, { method: 'DELETE' })
            if (res.ok) {
                fetchMedia() // Refresh list
            }
        } catch (e) {
            console.error("Failed to delete", e)
        }
    }

    if (loading) return <div className="text-xs text-gray-500">Loading library...</div>
    if (media.length === 0) return <div className="text-xs text-gray-500 italic">No uploads yet.</div>

    return (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {media.map((item) => (
                <div
                    key={item.name}
                    onClick={() => onSelect(item.url, item.type)}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-neon-cyan transition-all"
                >
                    {item.type === 'video' ? (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <Film className="w-6 h-6 text-gray-500" />
                            <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted />
                        </div>
                    ) : (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            onClick={(e) => handleDelete(e, item.name)}
                            className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    currentTitle: string
    onTitleChange: (newTitle: string) => void
    bgConfig: BackgroundConfig
    onBgChange: (config: BackgroundConfig) => void
    logoConfig: LogoConfig
    onLogoChange: (config: LogoConfig) => void
    iconConfig: IconConfig
    onIconConfigChange: (config: IconConfig) => void
    titleConfig: TitleConfig
    onTitleConfigChange: (config: TitleConfig) => void
    openInNewTab: boolean
    onOpenInNewTabChange: (enabled: boolean) => void
    onAddWidget?: (type: WidgetData['type']) => void
    layoutMode: LayoutMode
    onLayoutModeChange: (mode: LayoutMode) => void
    widgetDefaults?: WidgetDefaults
    onWidgetDefaultsChange?: (defaults: WidgetDefaults) => void
    onSaveAsDefault?: () => void
    serverMode?: string
    onLogout?: () => void
}

export function SettingsModal({
    isOpen,
    onClose,
    currentTitle,
    onTitleChange,
    bgConfig,
    onBgChange,
    logoConfig,
    onLogoChange,
    iconConfig,
    onIconConfigChange,
    titleConfig,
    onTitleConfigChange,
    openInNewTab,
    onOpenInNewTabChange,
    layoutMode,
    onLayoutModeChange,
    widgetDefaults,
    onWidgetDefaultsChange,
    onSaveAsDefault,
    serverMode,
    onLogout
}: SettingsModalProps) {
    const {
        config: monitoringConfig,
        toggleEnabled: toggleMonitoringEnabled,
        toggleDemoMode: toggleMonitoringDemoMode,
        toggleVarcoIntegration,
        updatePollingInterval: updateMonitoringPollingInterval,
    } = useMonitoring()
    const [activeTab, setActiveTab] = useState<'general' | 'widgets' | 'monitoring' | 'logs' | 'background' | 'logo' | 'effects' | 'security' | 'about'>('general')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const logoFileInputRef = useRef<HTMLInputElement>(null)

    // Local state for Media URL to allow typing
    const [mediaUrlInput, setMediaUrlInput] = useState('')

    // Widget Defaults State
    const [weatherLocationInput, setWeatherLocationInput] = useState(widgetDefaults?.weatherLocation || 'Berlin')
    const [weatherUnitInput, setWeatherUnitInput] = useState<'c' | 'f'>(widgetDefaults?.weatherUnit || 'c')
    const [clockFormatInput, setClockFormatInput] = useState<'24h' | '12h'>(widgetDefaults?.clockFormat || '24h')
    const [dateFormatInput, setDateFormatInput] = useState(widgetDefaults?.dateFormat || 'DD.MM.YYYY')

    useEffect(() => {
        if (widgetDefaults) {
            setWeatherLocationInput(widgetDefaults.weatherLocation || 'Berlin')
            setWeatherUnitInput(widgetDefaults.weatherUnit || 'c')
            setClockFormatInput(widgetDefaults.clockFormat || '24h')
            setDateFormatInput(widgetDefaults.dateFormat || 'DD.MM.YYYY')
        }
    }, [widgetDefaults])

    const updateWidgetDefaults = (updates: Partial<WidgetDefaults>) => {
        onWidgetDefaultsChange?.({
            weatherLocation: weatherLocationInput,
            weatherUnit: weatherUnitInput,
            clockFormat: clockFormatInput,
            dateFormat: dateFormatInput,
            ...updates,
        })
    }

    // Sync input with bgConfig.value *only* if it's external, otherwise keep what the user types or empty
    useEffect(() => {
        if (!bgConfig.value) {
            setMediaUrlInput('')
        } else if (bgConfig.value === 'gradient') {
            setMediaUrlInput('')
        } else if (bgConfig.value.startsWith('blob:')) {
            setMediaUrlInput('') // Don't show blob URLs
        } else {
            setMediaUrlInput(bgConfig.value)
        }
    }, [bgConfig.value])

    if (!isOpen) return null

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLogo = false) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            alert("File too large (max 10MB)")
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/v1/media/upload', { // Use relative path
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Upload failed')
            }

            const data = await res.json()
            // Backend returns relative URL like /uploads/filename.ext

            if (isLogo) {
                onLogoChange({
                    type: 'image',
                    value: `${data.url}?v=${Date.now()}`
                })
            } else {
                onBgChange({
                    type: data.type,
                    value: data.url
                })
            }
        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : 'Unknown error'
            alert(`Upload failed: ${message}`)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-3xl glass-panel rounded-2xl flex flex-col max-h-[90vh] relative animate-in fade-in zoom-in-95 duration-200">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 pb-2 border-b border-white/10">
                    <h2 className="text-xl font-bold text-neon-cyan">Settings</h2>
                    <div className="flex gap-4 mt-6 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'general' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('widgets')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'widgets' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Widgets
                        </button>
                        <button
                            onClick={() => setActiveTab('monitoring')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'monitoring' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Monitoring
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'logs' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Logs & Diagnose
                        </button>
                        <button
                            onClick={() => setActiveTab('background')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'background' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Background
                        </button>
                        <button
                            onClick={() => setActiveTab('logo')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'logo' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Logo
                        </button>
                        <button
                            onClick={() => setActiveTab('effects')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'effects' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Effects
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'security' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'about' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            About
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Page Title</label>
                                <input
                                    type="text"
                                    value={currentTitle}
                                    onChange={(e) => onTitleChange(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-neon-cyan/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                    placeholder="Enter dashboard title..."
                                />
                            </div>

                            <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-neon-purple" />
                                    Default Layout
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => onLayoutModeChange('grid')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${layoutMode === 'grid' ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Standard Grid
                                    </button>
                                    <button
                                        onClick={() => onLayoutModeChange('rich-grid')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${layoutMode === 'rich-grid' ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Rich Grid
                                    </button>
                                    <button
                                        onClick={() => onLayoutModeChange('compact')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${layoutMode === 'compact' ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Compact
                                    </button>
                                    <button
                                        onClick={() => onLayoutModeChange('list')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${layoutMode === 'list' ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        List View
                                    </button>
                                    <button
                                        onClick={() => onLayoutModeChange('categories')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${layoutMode === 'categories' ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Categories
                                    </button>
                                </div>

                                {/* Save As Default Button */}
                                {onSaveAsDefault && layoutMode !== serverMode && (
                                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                                        <div className="text-xs text-yellow-400/80">
                                            Current view is a local override.
                                        </div>
                                        <button
                                            onClick={onSaveAsDefault}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 transition-colors text-xs font-bold"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Set as Server Default
                                        </button>
                                    </div>
                                )}
                                {onSaveAsDefault && layoutMode === serverMode && (
                                    <div className="mt-2 text-[10px] text-gray-500 text-center italic">
                                        Server Default matches your current view.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="w-5 h-5 text-neon-cyan" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Open Apps in New Tab</h3>
                                        <p className="text-xs text-gray-400">Launch applications in a new browser tab</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenInNewTabChange(!openInNewTab)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${openInNewTab ? 'bg-neon-cyan' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${openInNewTab ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <label className="text-sm font-medium text-gray-400">Title Style</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => onTitleConfigChange({ ...titleConfig, style: 'default' })}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${titleConfig.style === 'default'
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Default
                                    </button>
                                    <button
                                        onClick={() => onTitleConfigChange({ ...titleConfig, style: 'solid', color: titleConfig.color || '#ffffff' })}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${titleConfig.style === 'solid'
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Solid
                                    </button>
                                    <button
                                        onClick={() => onTitleConfigChange({ ...titleConfig, style: 'gradient', gradientColors: titleConfig.gradientColors || ['#00f3ff', '#9d00ff'] })}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${titleConfig.style === 'gradient'
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Gradient
                                    </button>
                                </div>

                                {titleConfig.style === 'solid' && (
                                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                                        <input
                                            type="color"
                                            value={titleConfig.color}
                                            onChange={(e) => onTitleConfigChange({ ...titleConfig, color: e.target.value })}
                                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-sm text-gray-400 font-mono">{titleConfig.color}</span>
                                    </div>
                                )}

                                {titleConfig.style === 'gradient' && (
                                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs text-gray-500">Start Color</span>
                                            <input
                                                type="color"
                                                value={titleConfig.gradientColors?.[0]}
                                                onChange={(e) => onTitleConfigChange({
                                                    ...titleConfig,
                                                    gradientColors: [e.target.value, titleConfig.gradientColors?.[1] || '#ffffff']
                                                })}
                                                className="w-full h-8 rounded cursor-pointer bg-transparent border-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs text-gray-500">End Color</span>
                                            <input
                                                type="color"
                                                value={titleConfig.gradientColors?.[1]}
                                                onChange={(e) => onTitleConfigChange({
                                                    ...titleConfig,
                                                    gradientColors: [titleConfig.gradientColors?.[0] || '#ffffff', e.target.value]
                                                })}
                                                className="w-full h-8 rounded cursor-pointer bg-transparent border-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'widgets' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5 text-neon-purple" />
                                Widget Defaults & Configuration
                            </h3>
                            <p className="text-xs text-gray-400">
                                Configure default global preferences for widgets (Weather location, clock & date formats).
                            </p>

                            {/* Weather Widget Defaults */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                                    <CloudSun className="w-4 h-4" /> Weather Defaults
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Default City / Location</label>
                                        <input
                                            type="text"
                                            value={weatherLocationInput}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setWeatherLocationInput(val)
                                                updateWidgetDefaults({ weatherLocation: val })
                                            }}
                                            placeholder="e.g. Berlin, Munich, Vienna..."
                                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Temperature Unit</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWeatherUnitInput('c')
                                                    updateWidgetDefaults({ weatherUnit: 'c' })
                                                }}
                                                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${weatherUnitInput === 'c' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                                            >
                                                Celsius (°C)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setWeatherUnitInput('f')
                                                    updateWidgetDefaults({ weatherUnit: 'f' })
                                                }}
                                                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${weatherUnitInput === 'f' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                                            >
                                                Fahrenheit (°F)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Clock Widget Defaults */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                                    <Clock className="w-4 h-4" /> Clock & Date Defaults
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Time Format</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setClockFormatInput('24h')
                                                    updateWidgetDefaults({ clockFormat: '24h' })
                                                }}
                                                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${clockFormatInput === '24h' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                                            >
                                                24-Hour (23:59)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setClockFormatInput('12h')
                                                    updateWidgetDefaults({ clockFormat: '12h' })
                                                }}
                                                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition ${clockFormatInput === '12h' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                                            >
                                                12-Hour (11:59 PM)
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Date Format</label>
                                        <select
                                            value={dateFormatInput}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setDateFormatInput(val)
                                                updateWidgetDefaults({ dateFormat: val })
                                            }}
                                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-neon-cyan cursor-pointer"
                                        >
                                            <option value="DD.MM.YYYY">DD.MM.YYYY (e.g. 26.07.2026)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-26)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/26/2026)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monitoring' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-semibold text-white">Enable Monitoring Overlay</div>
                                        <div className="text-xs text-gray-400">Activates the Monitoring Bridge Overlay and keyboard shortcut (Ctrl+Shift+M).</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleMonitoringEnabled}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            monitoringConfig?.enabled !== false ? 'bg-neon-cyan' : 'bg-gray-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                monitoringConfig?.enabled !== false ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-semibold text-white">Demo Mode / Live Simulation</div>
                                        <div className="text-xs text-gray-400">Generates simulated live data & network jitter for demo purposes.</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleMonitoringDemoMode}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            monitoringConfig?.demoMode !== false ? 'bg-neon-cyan' : 'bg-gray-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                monitoringConfig?.demoMode !== false ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-semibold text-white">Varco Bridge Integration</div>
                                        <div className="text-xs text-gray-400">Enables automatic background sync & manifest imports from Varco Bridge / Home Assistant.</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleVarcoIntegration}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            monitoringConfig?.providers?.find((p) => p.type === 'varco')?.enabled === true ? 'bg-neon-cyan' : 'bg-gray-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                monitoringConfig?.providers?.find((p) => p.type === 'varco')?.enabled === true ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-white">Server Background Polling Interval</label>
                                        <span className="text-xs font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded border border-neon-cyan/30">
                                            {(() => {
                                                const totalSec = monitoringConfig?.polling_interval_seconds || monitoringConfig?.pollingIntervalSeconds || 15
                                                if (totalSec >= 3600 && totalSec % 3600 === 0) return `${totalSec / 3600} hours`
                                                if (totalSec >= 60 && totalSec % 60 === 0) return `${totalSec / 60} minutes`
                                                return `${totalSec} seconds`
                                            })()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { sec: 5, label: '5s (Fast)' },
                                            { sec: 15, label: '15s (Recommended)' },
                                            { sec: 30, label: '30s (Balanced)' },
                                            { sec: 60, label: '60s (Low Traffic)' },
                                        ].map((opt) => {
                                            const currentSec = monitoringConfig?.polling_interval_seconds || monitoringConfig?.pollingIntervalSeconds || 15
                                            const isSelected = currentSec === opt.sec
                                            return (
                                                <button
                                                    key={opt.sec}
                                                    type="button"
                                                    onClick={() => updateMonitoringPollingInterval(opt.sec)}
                                                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition ${
                                                        isSelected
                                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Custom Interval Input (Value + Unit) */}
                                    <div className="pt-2">
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Benutzerdefiniertes Intervall (Custom)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={5}
                                                max={86400}
                                                value={(() => {
                                                    const totalSec = monitoringConfig?.polling_interval_seconds || monitoringConfig?.pollingIntervalSeconds || 15
                                                    if (totalSec >= 3600 && totalSec % 3600 === 0) return totalSec / 3600
                                                    if (totalSec >= 60 && totalSec % 60 === 0) return totalSec / 60
                                                    return totalSec
                                                })()}
                                                onChange={(e) => {
                                                    const num = parseInt(e.target.value, 10) || 5
                                                    const totalSec = monitoringConfig?.polling_interval_seconds || monitoringConfig?.pollingIntervalSeconds || 15
                                                    let unitMultiplier = 1
                                                    if (totalSec >= 3600 && totalSec % 3600 === 0) unitMultiplier = 3600
                                                    else if (totalSec >= 60 && totalSec % 60 === 0) unitMultiplier = 60
                                                    updateMonitoringPollingInterval(num * unitMultiplier)
                                                }}
                                                className="w-32 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-neon-cyan"
                                            />
                                            <select
                                                value={(() => {
                                                    const totalSec = monitoringConfig?.polling_interval_seconds || monitoringConfig?.pollingIntervalSeconds || 15
                                                    if (totalSec >= 3600 && totalSec % 3600 === 0) return 'hours'
                                                    if (totalSec >= 60 && totalSec % 60 === 0) return 'minutes'
                                                    return 'seconds'
                                                })()}
                                                onChange={(e) => {
                                                    const totalSec = monitoringConfig?.polling_interval_seconds || monitoringConfig?.pollingIntervalSeconds || 15
                                                    let currentNum = totalSec
                                                    if (totalSec >= 3600 && totalSec % 3600 === 0) currentNum = totalSec / 3600
                                                    else if (totalSec >= 60 && totalSec % 60 === 0) currentNum = totalSec / 60

                                                    const unit = e.target.value
                                                    let mult = 1
                                                    if (unit === 'hours') mult = 3600
                                                    else if (unit === 'minutes') mult = 60

                                                    updateMonitoringPollingInterval(currentNum * mult)
                                                }}
                                                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-neon-cyan cursor-pointer"
                                            >
                                                <option value="seconds" className="bg-gray-900 text-white">Sekunden (Seconds)</option>
                                                <option value="minutes" className="bg-gray-900 text-white">Minuten (Minutes)</option>
                                                <option value="hours" className="bg-gray-900 text-white">Stunden (Hours)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                                        💡 <strong>Recommendation Note:</strong> Setting an interval lower than 5s causes unnecessary CPU and network overhead on the Home Assistant / Varco Bridge server. Setting it above 60s will delay live metric updates in all browser sessions.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && <SystemLogsViewer />}

                    {activeTab === 'background' && (
                        <div className="space-y-6">
                            {/* Presets */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onBgChange({ type: 'image', value: 'gradient' })}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${bgConfig.value === 'gradient' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Monitor className="w-6 h-6" />
                                    <span className="text-xs font-medium">Default Gradient</span>
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Media Library</h3>
                                <MediaLibrary
                                    onSelect={(url, type) => onBgChange({ type: type as 'image' | 'video', value: url })}
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Custom Media</h3>
                                <p className="text-xs text-gray-500">Supports Images (JPG, PNG, WebP) and Videos (MP4, WebM)</p>

                                {/* Unified URL Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400">Media URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={mediaUrlInput}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setMediaUrlInput(val)
                                                // Only update main config if it looks like a valid URL or path
                                                // to avoid flickering or invalid states in the preview
                                                const isVideo = /\.(mp4|webm|mov)$/i.test(val)
                                                onBgChange({
                                                    type: isVideo ? 'video' : 'image',
                                                    value: val
                                                })
                                            }}
                                            placeholder="https://example.com/media.jpg"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-neon-cyan outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-white/10"></span>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-[#1a1a1a] px-2 text-gray-500">Or upload</span>
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex justify-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,video/*"
                                        onChange={(e) => handleFileUpload(e, false)}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 hover:border-white/20 disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        <span className="text-sm">Upload File (Max 10MB)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logo' && (
                        <div className="space-y-6">
                            {/* Presets */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onLogoChange({ ...logoConfig, type: 'default', value: undefined })}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${logoConfig.type === 'default' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Sparkles className="w-6 h-6" />
                                    <span className="text-xs font-medium">Default Animated</span>
                                </button>
                            </div>

                            {/* Click to Reset Setting */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-white">Logo/Titel-Klick springt zur Standard-View</div>
                                        <div className="text-[11px] text-gray-400">Beim Klick auf das Logo oder den Titel wird von Canvas / Sub-Views zurück zur Hauptansicht gesprungen.</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onLogoChange({ ...logoConfig, clickToResetView: logoConfig.clickToResetView === false })}
                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                            logoConfig.clickToResetView !== false ? 'bg-neon-cyan' : 'bg-gray-700'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                logoConfig.clickToResetView !== false ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Media Library</h3>
                                <MediaLibrary
                                    onSelect={(url) => onLogoChange({ type: 'image', value: url })}
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Custom Logo</h3>
                                <p className="text-xs text-gray-500">Supports Images (JPG, PNG, WebP, SVG)</p>

                                {/* URL Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400">Image URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={logoConfig.type === 'image' && logoConfig.value ? logoConfig.value : ''}
                                            onChange={(e) => onLogoChange({ type: 'image', value: e.target.value })}
                                            placeholder="https://example.com/logo.png"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-neon-cyan outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-white/10"></span>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-[#1a1a1a] px-2 text-gray-500">Or upload</span>
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex justify-center">
                                    <input
                                        type="file"
                                        ref={logoFileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, true)}
                                    />
                                    <button
                                        onClick={() => logoFileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 hover:border-white/20 disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        <span className="text-sm">Upload Logo</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'effects' && (
                        <div className="space-y-6">
                            {/* Icon Border */}
                            <div className="rounded-xl border border-white/10 p-4 bg-black/40 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5 text-neon-cyan" />
                                        <div>
                                            <h3 className="text-sm font-medium text-white">Neon Border</h3>
                                            <p className="text-xs text-gray-400">Add a glowing border to icons</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onIconConfigChange({ ...iconConfig, showBorder: !iconConfig.showBorder })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${iconConfig.showBorder ? 'bg-neon-cyan' : 'bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${iconConfig.showBorder ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {iconConfig.showBorder && (
                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex gap-2 p-1 rounded-lg bg-black/20">
                                            {(['default', 'solid', 'gradient'] as const).map((style) => (
                                                <button
                                                    key={style}
                                                    onClick={() => onIconConfigChange({ ...iconConfig, borderStyle: style })}
                                                    className={`flex-1 py-1.5 px-3 rounded text-xs transition-all capitalize ${iconConfig.borderStyle === style ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>

                                        {iconConfig.borderStyle === 'solid' && (
                                            <div className="flex items-center gap-3 animate-in fade-in">
                                                <input
                                                    type="color"
                                                    value={iconConfig.borderColor}
                                                    onChange={(e) => onIconConfigChange({ ...iconConfig, borderColor: e.target.value })}
                                                    className="h-8 w-12 rounded cursor-pointer bg-transparent border border-white/20"
                                                />
                                                <span className="text-xs text-gray-400">Border Color</span>
                                            </div>
                                        )}

                                        {iconConfig.borderStyle === 'gradient' && (
                                            <div className="space-y-2 animate-in fade-in">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] text-gray-600">Start Color</span>
                                                        <input
                                                            type="color"
                                                            value={iconConfig.borderGradientColors?.[0] || '#00f3ff'}
                                                            onChange={(e) => onIconConfigChange({ ...iconConfig, borderGradientColors: [e.target.value, iconConfig.borderGradientColors?.[1] || '#9d00ff'] })}
                                                            className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] text-gray-600">End Color</span>
                                                        <input
                                                            type="color"
                                                            value={iconConfig.borderGradientColors?.[1] || '#9d00ff'}
                                                            onChange={(e) => onIconConfigChange({ ...iconConfig, borderGradientColors: [iconConfig.borderGradientColors?.[0] || '#00f3ff', e.target.value] })}
                                                            className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Background Style */}
                            <div className="rounded-xl border border-white/10 p-4 bg-black/40 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Palette className="w-5 h-5 text-neon-purple" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Tile Background</h3>
                                        <p className="text-xs text-gray-400">Glass, Solid Color, or Gradient</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Style Toggle */}
                                    <div className="flex gap-2 p-1 rounded-lg bg-black/20">
                                        {(['glass', 'solid', 'gradient'] as const).map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => onIconConfigChange({ ...iconConfig, backgroundStyle: style })}
                                                className={`flex-1 py-1.5 px-3 rounded text-xs transition-all capitalize ${iconConfig.backgroundStyle === style ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Opacity Control (Only for Solid/Gradient) */}
                                    {iconConfig.backgroundStyle !== 'glass' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>Opacity</span>
                                                <span>{iconConfig.backgroundOpacity ?? 10}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={iconConfig.backgroundOpacity ?? 10}
                                                onChange={(e) => onIconConfigChange({ ...iconConfig, backgroundOpacity: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                                            />
                                        </div>
                                    )}

                                    {iconConfig.backgroundStyle === 'solid' && (
                                        <div className="flex items-center gap-3 animate-in fade-in">
                                            <input
                                                type="color"
                                                value={iconConfig.backgroundColor}
                                                onChange={(e) => onIconConfigChange({ ...iconConfig, backgroundColor: e.target.value })}
                                                className="h-8 w-12 rounded cursor-pointer bg-transparent border border-white/20"
                                            />
                                            <span className="text-xs text-gray-400">Background Color</span>
                                        </div>
                                    )}

                                    {iconConfig.backgroundStyle === 'gradient' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <div className="flex gap-2">
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-[10px] text-gray-600">Start Color</span>
                                                    <input
                                                        type="color"
                                                        value={iconConfig.gradientColors?.[0] || '#1a1a1a'}
                                                        onChange={(e) => onIconConfigChange({ ...iconConfig, gradientColors: [e.target.value, iconConfig.gradientColors?.[1] || '#000000'] })}
                                                        className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-[10px] text-gray-600">End Color</span>
                                                    <input
                                                        type="color"
                                                        value={iconConfig.gradientColors?.[1] || '#000000'}
                                                        onChange={(e) => onIconConfigChange({ ...iconConfig, gradientColors: [iconConfig.gradientColors?.[0] || '#1a1a1a', e.target.value] })}
                                                        className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                    Change Password
                                </h3>
                                <ChangePasswordForm />
                            </div>

                            {onLogout && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-medium text-red-400">Log Out</h3>
                                        <p className="text-xs text-gray-400">Sign out of your session on this device.</p>
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-neon-cyan/20 rounded-full flex items-center justify-center mb-2">
                                    <Sparkles className="w-8 h-8 text-neon-cyan" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">ER-Startseite</h3>
                                    <p className="text-gray-400 text-sm">A modern, highly customizable dashboard.</p>
                                </div>
                                <VersionDisplay />
                                <div className="flex gap-4 pt-4">
                                    <a
                                        href="https://github.com/Eidolf/ER-Startseite"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-[#2b3137] hover:bg-[#24292e] text-white rounded-lg transition-colors border border-white/10"
                                    >
                                        <Github className="w-4 h-4" />
                                        <span>Source Code</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function VersionDisplay() {
    const [version, setVersion] = useState<string>('...')

    useEffect(() => {
        fetch('/health')
            .then(res => res.json())
            .then(data => {
                if (data.version) setVersion(data.version)
            })
            .catch(() => setVersion('Unknown'))
    }, [])

    return (
        <div className="bg-white/5 rounded-lg p-2 px-4 border border-white/5 inline-flex items-center gap-2">
            <span className="text-sm text-gray-400">Software Version</span>
            <span className="text-neon-cyan font-mono text-sm font-bold">{version}</span>
        </div>
    )
}
