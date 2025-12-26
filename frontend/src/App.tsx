import { useState, useEffect } from 'react'
import { AppIcon } from './components/AppIcon'
import { Search, Settings, Plus, Pencil, Trash2 } from 'lucide-react'
import { SettingsModal } from './components/SettingsModal'

// Define Background Config Type
export interface BackgroundConfig {
    type: 'image' | 'video'
    value: string // URL or 'gradient'
}

// Define Icon Config Type
export interface IconConfig {
    showBorder: boolean
    borderStyle: 'default' | 'solid' | 'gradient'
    borderColor: string
    borderGradientColors: [string, string]
    backgroundStyle: 'glass' | 'solid' | 'gradient'
    backgroundColor: string
    gradientColors: [string, string]
}

const DEFAULT_BG: BackgroundConfig = {
    type: 'image',
    value: 'gradient'
}

const DEFAULT_ICON_CONFIG: IconConfig = {
    showBorder: true,
    borderStyle: 'default',
    borderColor: '#00f3ff', // neon-cyan
    borderGradientColors: ['#00f3ff', '#9d00ff'], // Cyan -> Purple
    backgroundStyle: 'glass',
    backgroundColor: '#1a1a1a',
    gradientColors: ['#3b82f6', '#9333ea']
}

function App() {
    // Load from local storage or default
    const [bgConfig, setBgConfig] = useState<BackgroundConfig>(() => {
        const saved = localStorage.getItem('er_startseite_bg')
        return saved ? JSON.parse(saved) : DEFAULT_BG
    })

    const [iconConfig, setIconConfig] = useState<IconConfig>(() => {
        const saved = localStorage.getItem('er_startseite_icon_config')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                return { ...DEFAULT_ICON_CONFIG, ...parsed }
            } catch (e) {
                console.error("Failed to parse icon config", e)
                return DEFAULT_ICON_CONFIG
            }
        }
        return DEFAULT_ICON_CONFIG
    })

    const [searchQuery, setSearchQuery] = useState('')
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [pageTitle, setPageTitle] = useState(() => localStorage.getItem('er_startseite_title') || 'ER-Startseite')

    // New State for Edit Mode
    const [isEditMode, setIsEditMode] = useState(false)

    // Persistence effects
    useEffect(() => {
        localStorage.setItem('er_startseite_bg', JSON.stringify(bgConfig))
    }, [bgConfig])

    useEffect(() => {
        localStorage.setItem('er_startseite_icon_config', JSON.stringify(iconConfig))
    }, [iconConfig])

    useEffect(() => {
        localStorage.setItem('er_startseite_title', pageTitle)
    }, [pageTitle])

    // Helper to generate icon style
    const getIconStyle = () => {
        const style: React.CSSProperties & { [key: string]: string } = {}

        // Background Logic
        if (iconConfig.backgroundStyle === 'solid') {
            style.background = iconConfig.backgroundColor
            style.backdropFilter = 'none'
        } else if (iconConfig.backgroundStyle === 'gradient') {
            style.background = `linear-gradient(135deg, ${iconConfig.gradientColors[0]}, ${iconConfig.gradientColors[1]})`
            style.backdropFilter = 'none'
        }

        // Border Variables
        if (iconConfig.showBorder) {
            if (iconConfig.borderStyle === 'solid') {
                style['--border-color'] = iconConfig.borderColor
                style['--shadow-color'] = iconConfig.borderColor
            } else if (iconConfig.borderStyle === 'gradient') {
                style['--border-start'] = iconConfig.borderGradientColors?.[0] || '#00f3ff'
                style['--border-end'] = iconConfig.borderGradientColors?.[1] || '#9d00ff'
                style['--shadow-color'] = iconConfig.borderGradientColors?.[0] || '#00f3ff'
            } else {
                // Default (Title Gradient)
                style['--border-start'] = '#00f3ff'
                style['--border-end'] = '#9d00ff'
                style['--shadow-color'] = '#00f3ff'
            }
        }

        return style as React.CSSProperties
    }

    // Determine classes based on config
    let tileClass = "relative rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer group hover:z-10 overflow-visible "

    // Background classes
    if (iconConfig.backgroundStyle === 'glass') {
        tileClass += "glass-panel "
    } else {
        tileClass += "shadow-xl "
    }

    // Border/Interactive classes
    if (iconConfig.showBorder) {
        tileClass += "hover:scale-105 active:scale-95 "
        if (iconConfig.borderStyle === 'solid') {
            tileClass += "custom-border-solid "
        } else {
            tileClass += "custom-border-gradient "
        }
    } else {
        tileClass += "hover:scale-105 hover:bg-white/5 border border-white/5 "
    }

    const [apps, setApps] = useState<any[]>([])
    const [isAddAppOpen, setIsAddAppOpen] = useState(false)

    // Fetch Apps
    const fetchApps = async () => {
        try {
            const res = await fetch('/api/v1/apps')
            if (res.ok) {
                const data = await res.json()
                setApps(data)
            }
        } catch (e) {
            console.error("Failed to fetch apps", e)
        }
    }

    // Delete App
    const handleDeleteApp = async (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm("Delete this app?")) return

        try {
            const res = await fetch(`/api/v1/apps/${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchApps()
            }
        } catch (e) {
            console.error("Failed to delete app", e)
        }
    }

    useEffect(() => {
        fetchApps()
    }, [])

    return (
        <div className="min-h-screen relative overflow-hidden text-white font-sans">
            {/* Background */}
            <div className="absolute inset-0 z-0 bg-black">
                {bgConfig.type === 'video' && bgConfig.value ? (
                    <video
                        autoPlay
                        loop
                        muted
                        className="w-full h-full object-cover"
                        key={bgConfig.value} // Force reload on source change
                    >
                        <source src={bgConfig.value} type="video/mp4" />
                    </video>
                ) : bgConfig.value === 'gradient' ? (
                    <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black" />
                ) : (
                    <div
                        className="w-full h-full bg-cover bg-center transition-all duration-500"
                        style={{ backgroundImage: `url(${bgConfig.value})` }}
                    />
                )}
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentTitle={pageTitle}
                onTitleChange={setPageTitle}
                bgConfig={bgConfig}
                onBgChange={setBgConfig}
                iconConfig={iconConfig}
                onIconConfigChange={setIconConfig}
            />

            <AddAppModal
                isOpen={isAddAppOpen}
                onClose={() => setIsAddAppOpen(false)}
                onAdded={fetchApps}
            />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col h-screen">

                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple" style={{ textShadow: '0 0 10px rgba(6, 182, 212, 0.3)' }}>
                        {pageTitle}
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`p-2 rounded-full glass-panel transition ${isEditMode ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/10 text-gray-400'}`}
                            title="Edit Mode"
                        >
                            <Pencil className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 rounded-full glass-panel hover:bg-white/10 transition"
                            title="Settings"
                        >
                            <Settings className="w-6 h-6 text-neon-cyan" />
                        </button>
                    </div>
                </header>

                {/* Search */}
                <div className="max-w-2xl mx-auto w-full mb-16 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-neon-cyan transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-4 rounded-xl glass-panel border-white/10 text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-transparent transition-all"
                        placeholder="Search the web or your apps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
                            }
                        }}
                    />
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 p-6">
                        {/* Dynamic Apps from API */}
                        {apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase())).map((app) => (
                            <a
                                key={app.id}
                                href={!isEditMode ? app.url : undefined}
                                onClick={(e) => isEditMode && e.preventDefault()}
                                className={`${tileClass} ${isEditMode ? 'animate-pulse cursor-default' : ''}`}
                                style={getIconStyle()}
                            >
                                {isEditMode && (
                                    <button
                                        onClick={(e) => handleDeleteApp(e, app.id)}
                                        className="absolute -top-2 -right-2 z-20 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}

                                <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5">
                                    <AppIcon
                                        src={app.icon_url}
                                        alt={app.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="font-medium text-gray-200 group-hover:text-white text-center text-sm truncate w-full px-2">{app.name}</span>
                            </a>
                        ))}

                        {/* Add New Tile */}
                        <div
                            onClick={() => setIsAddAppOpen(true)}
                            className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-dashed border-2 border-white/20 min-h-[140px]"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <Plus className="w-8 h-8 text-gray-400" />
                            </div>
                            <span className="font-medium text-gray-400">Add App</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

function AddAppModal({ isOpen, onClose, onAdded }: { isOpen: boolean, onClose: () => void, onAdded: () => void }) {
    const [name, setName] = useState('')
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Basic URL validation/fix
        let finalUrl = url
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = 'https://' + finalUrl
        }

        try {
            const res = await fetch('/api/v1/apps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, url: finalUrl })
            })
            if (res.ok) {
                onAdded()
                onClose()
                setName('')
                setUrl('')
            }
        } catch (e) {
            console.error("Failed to add app", e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel">
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Add New App</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">App Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Google"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-neon-cyan outline-none transition"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">URL</label>
                        <input
                            type="text"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="example.com"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-neon-cyan outline-none transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-neon-cyan hover:bg-cyan-400 text-black font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Adding...' : 'Add App'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default App
