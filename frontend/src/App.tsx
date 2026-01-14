import { useState, useEffect } from 'react'
import { AppIcon } from './components/AppIcon'
import { AnimatedLogo } from './components/AnimatedLogo'
import { Plus, Search, Settings, LayoutGrid, X, Trash, EyeOff, Folder, Pencil, PlusCircle, UserCheck, ArrowUpFromLine } from 'lucide-react'
import { SettingsModal } from './components/SettingsModal'
import { AppDetailsModal } from './components/AppDetailsModal'
import { LayoutMenu } from './components/LayoutMenu'
import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { RichAppTile } from './components/RichAppTile'
import { AppData, BackgroundConfig, LogoConfig, IconConfig, LayoutConfig, TitleConfig, WidgetData } from './types'
import { DEFAULT_BG, DEFAULT_LOGO_CONFIG, DEFAULT_TITLE_CONFIG, DEFAULT_ICON_CONFIG, DEFAULT_LAYOUT_CONFIG } from './defaults'
import { AppFormModal } from './components/AppFormModal'
import { WidgetTile } from './components/WidgetTile'
import { WeatherWidget } from './components/widgets/WeatherWidget'
import { ClockWidget } from './components/widgets/ClockWidget'
import { CalendarWidget } from './components/widgets/CalendarWidget'
import { WidgetContextModal } from './components/WidgetContextModal'

interface SortableAppTileProps {
    app: AppData
    isEditMode: boolean
    tileClass: string
    style: React.CSSProperties
    children: React.ReactNode
    onClick: (e: React.MouseEvent) => void
    onDelete: (e: React.MouseEvent, id: string) => void
    onEdit?: (e: React.MouseEvent, app: AppData) => void
    onContextMenu?: (e: React.MouseEvent, app: AppData) => void
}

function SortableAppTile({ app, isEditMode, tileClass, style, children, onClick, onDelete, onEdit, onContextMenu }: SortableAppTileProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id, disabled: !isEditMode });

    // Enable drop for folders
    const { setNodeRef: setDroppableRef, isOver: isDroppableOver } = useDroppable({
        id: `folder-drop-${app.id}`,
        disabled: app.type !== 'folder',
        data: { folderId: app.id }
    });

    const combinedStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...style,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        touchAction: 'pan-y',
        ...(isDroppableOver && app.type === 'folder' ? {
            borderColor: '#00f3ff',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.5)',
            transform: `${CSS.Transform.toString(transform)} scale(1.05)`
        } : {})
    };

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                if (app.type === 'folder') setDroppableRef(node);
            }}
            style={combinedStyle}
            {...attributes}
            {...listeners}
            className={`relative ${tileClass} ${isEditMode ? 'cursor-grab active:cursor-grabbing animate-pulse' : ''}`}
            onClick={onClick}
            onContextMenu={(e) => {
                if (onContextMenu) {
                    e.preventDefault();
                    onContextMenu(e, app);
                }
            }}
        >
            {children}
            {isEditMode && (
                <>
                    <button
                        onClick={(e) => onDelete(e, app.id)}
                        className="absolute -top-2 -right-2 z-20 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg shrink-0 flex items-center justify-center"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(e, app); }}
                            className="absolute -top-2 -right-10 z-20 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition shadow-lg shrink-0 flex items-center justify-center"
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{ right: '2rem' }} // Offset from trash
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                </>
            )}
        </div>
    )
}

function DroppableContainer({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`${className} ${isOver ? 'bg-white/10 ring-2 ring-neon-cyan/50' : ''} transition-colors`}>
            {children}
        </div>
    );
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

function SetupModal({ onSetupComplete }: { onSetupComplete: () => void }) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const strength = getStrength(password)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 4) return alert("Password must be at least 4 characters")
        if (password !== confirmPassword) return alert("Passwords do not match")

        setLoading(true)
        try {
            const res = await fetch('/api/v1/auth/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })
            if (res.ok) {
                onSetupComplete()
            }
        } catch (e) {
            console.error("Setup failed", e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
            <div className="w-full max-w-md p-8 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-neon-cyan/20 blur-xl rounded-full animate-pulse"></div>
                    <div className="relative bg-black/50 p-6 rounded-full border border-neon-cyan/30 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                        <UserCheck className="w-12 h-12 text-neon-cyan" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to ER-Startseite</h2>
                <p className="text-gray-400 mb-6 text-center">Please create a secure Password to protect your settings.</p>
                <form onSubmit={handleSubmit} className="space-y-4 w-full">
                    <div className="space-y-2">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-xl text-white focus:ring-2 focus:ring-neon-cyan outline-none transition-all placeholder:text-gray-600"
                            placeholder="Create Password"
                            required
                            autoFocus
                        />
                        {/* Strength Meter */}
                        {password.length > 0 && (
                            <div className="flex items-center gap-2 px-1">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${getStrengthColor(strength)}`}
                                        style={{ width: `${(strength / 5) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-400 min-w-[60px] text-right">
                                    {getStrengthLabel(strength)}
                                </span>
                            </div>
                        )}
                    </div>

                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-xl text-white focus:ring-2 focus:ring-neon-cyan outline-none transition-all placeholder:text-gray-600"
                        placeholder="Confirm Password"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading || password.length < 4 || password !== confirmPassword}
                        className="w-full bg-neon-cyan text-black font-bold py-3 rounded-xl hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Setting up...' : 'Set Password & Start'}
                    </button>
                    {password !== confirmPassword && confirmPassword.length > 0 && (
                        <p className="text-red-400 text-xs text-center animate-pulse">Passwords do not match</p>
                    )}
                </form>
            </div>
        </div>
    )
}

function UnlockModal({ isOpen, onClose, onUnlock }: { isOpen: boolean, onClose: () => void, onUnlock: () => void }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)
    const [remember, setRemember] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setPassword('')
            setError(false)
            setRemember(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(false)
        try {
            const res = await fetch('/api/v1/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, remember })
            })
            if (res.ok) {
                onUnlock()
                onClose()
            } else {
                setError(true)
                setPassword('')
            }
        } catch (e) {
            console.error(e)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="max-w-xs w-full glass-panel border border-white/10 p-6 rounded-2xl text-center relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold text-white mb-4">Security Check</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(false); }}
                        placeholder="Password"
                        className={`w-full bg-black/50 border ${error ? 'border-red-500 animate-pulse' : 'border-white/10'} rounded-xl px-4 py-3 text-center text-xl tracking-[0.2em] text-white focus:ring-2 focus:ring-neon-cyan outline-none`}
                        autoFocus
                    />

                    <label className="flex items-center justify-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${remember ? 'bg-neon-cyan border-neon-cyan' : 'border-gray-500 group-hover:border-gray-300'}`}>
                            {remember && <UserCheck className="w-3 h-3 text-black" />}
                        </div>
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="hidden"
                        />
                        <span className={`text-sm ${remember ? 'text-neon-cyan' : 'text-gray-400 group-hover:text-gray-300'}`}>
                            Trust this device (30 days)
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-xl transition"
                    >
                        Unlock
                    </button>
                </form>
            </div>
        </div>
    )
}

function App() {
    // Auth State (Managed below)

    // Load defaults initially
    const [bgConfig, setBgConfig] = useState<BackgroundConfig>(DEFAULT_BG)
    const [logoConfig, setLogoConfig] = useState<LogoConfig>(DEFAULT_LOGO_CONFIG)
    const [iconConfig, setIconConfig] = useState<IconConfig>(DEFAULT_ICON_CONFIG)
    const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG)
    const [pageTitle, setPageTitle] = useState('ER-Startseite')
    const [openInNewTab, setOpenInNewTab] = useState(false)
    const [registryUrls, setRegistryUrls] = useState<string[]>([])

    // Client-Side View Persistence
    // 'localMode' overrides 'layoutConfig.mode' (Server Default) on this specific device
    const [localMode, setLocalMode] = useState<'grid' | 'list' | 'compact' | 'categories' | 'rich-grid' | null>(() => {
        return (localStorage.getItem('layoutMode') as 'grid' | 'list' | 'compact' | 'categories' | 'rich-grid' | null) || null
    })

    // The actual mode to display: Local Override > Server Default
    const activeLayoutMode = localMode || layoutConfig.mode

    const handleLocalModeChange = (mode: 'grid' | 'list' | 'compact' | 'categories' | 'rich-grid') => {
        setLocalMode(mode)
        localStorage.setItem('layoutMode', mode)
    }

    const handleSaveServerDefault = () => {
        setLayoutConfig(prev => ({ ...prev, mode: activeLayoutMode }))
        // Auto-save useEffect will pick this up
    }

    const [configLoaded, setConfigLoaded] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false)

    // New State for Edit Mode
    const [isEditMode, setIsEditMode] = useState(false)
    const [showHiddenApps, setShowHiddenApps] = useState(false)

    const [apps, setApps] = useState<AppData[]>([])
    const [isAppFormOpen, setIsAppFormOpen] = useState(false)
    const [editingApp, setEditingApp] = useState<AppData | null>(null)
    const [detailsApp, setDetailsApp] = useState<AppData | null>(null)
    const [contextWidget, setContextWidget] = useState<WidgetData | null>(null)

    // Auth State
    const [titleConfig, setTitleConfig] = useState<TitleConfig>(() => {
        const saved = localStorage.getItem('titleConfig')
        return saved ? JSON.parse(saved) : DEFAULT_TITLE_CONFIG
    })

    const [isSetup, setIsSetup] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [showUnlockModal, setShowUnlockModal] = useState(false)
    const [openFolder, setOpenFolder] = useState<AppData | null>(null)
    const [targetFolderId, setTargetFolderId] = useState<string | null>(null)
    const [pendingAction, setPendingAction] = useState<'settings' | 'layout_menu' | 'add_app' | 'edit_mode' | 'show_hidden' | null>(null)

    const [isLoadingAuth, setIsLoadingAuth] = useState(true)

    // Check Auth Status (Persistent)
    useEffect(() => {
        fetch('/api/v1/auth/status')
            .then(res => res.json())
            .then(data => {
                setIsSetup(data.is_setup)
                if (data.is_authenticated) {
                    setIsAuthenticated(true)
                }
            })
            .catch(e => console.error("Auth status check failed", e))
            .finally(() => setIsLoadingAuth(false))
    }, [])

    const handleLogout = async () => {
        if (!confirm("Are you sure you want to log out?")) return

        try {
            await fetch('/api/v1/auth/logout', { method: 'POST' })
            setIsAuthenticated(false)
            setIsSettingsOpen(false)
            window.location.reload()
        } catch (e) {
            console.error("Logout failed", e)
        }
    }

    const handleUnlockSuccess = () => {
        setIsAuthenticated(true)
        if (pendingAction === 'settings') setIsSettingsOpen(true)
        if (pendingAction === 'layout_menu') setIsLayoutMenuOpen(true)
        if (pendingAction === 'add_app') { setIsAppFormOpen(true); setEditingApp(null); }
        if (pendingAction === 'edit_mode') setIsEditMode(prev => !prev)
        if (pendingAction === 'show_hidden') setShowHiddenApps(prev => !prev)
        setPendingAction(null)
    }

    const handleProtectedAction = (action: 'settings' | 'layout_menu' | 'add_app' | 'edit_mode' | 'show_hidden') => {
        if (isAuthenticated) {
            if (action === 'settings') setIsSettingsOpen(true)
            if (action === 'layout_menu') setIsLayoutMenuOpen(true)
            if (action === 'add_app') { setIsAppFormOpen(true); setEditingApp(null); }
            if (action === 'edit_mode') setIsEditMode(prev => !prev)
            if (action === 'show_hidden') setShowHiddenApps(prev => !prev)
            return
        }
        setPendingAction(action)
        setShowUnlockModal(true)
    }

    // Dynamic Favicon Effect
    useEffect(() => {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
        link.type = 'image/x-icon'
        link.rel = 'icon'

        if (logoConfig.type === 'image' && logoConfig.value) {
            link.href = logoConfig.value
        } else {
            // Revert to default
            link.href = '/logo.svg' // Assuming logo.svg is the default as seen in index.html
        }

        document.getElementsByTagName('head')[0].appendChild(link)
    }, [logoConfig])

    // Fetch Config on Mount
    useEffect(() => {
        fetch('/api/v1/config')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setPageTitle(data.pageTitle || 'ER-Startseite')
                    setOpenInNewTab(data.openInNewTab || false)
                    setBgConfig(data.bgConfig || DEFAULT_BG)
                    setLogoConfig(data.logoConfig || DEFAULT_LOGO_CONFIG)
                    setIconConfig(data.iconConfig || DEFAULT_ICON_CONFIG)
                    setLayoutConfig(data.layoutConfig || DEFAULT_LAYOUT_CONFIG)
                    setRegistryUrls(data.registry_urls || [])
                }
            })
            .catch(e => console.error("Failed to load config", e))
            .finally(() => setConfigLoaded(true))
    }, [])

    // Auto-save Config
    useEffect(() => {
        if (!configLoaded) return

        const timer = setTimeout(() => {
            fetch('/api/v1/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageTitle,
                    openInNewTab,
                    bgConfig,
                    logoConfig,
                    iconConfig,
                    layoutConfig,
                    titleConfig, // Added titleConfig
                    registry_urls: registryUrls
                })
            }).catch(e => console.error("Failed to save config", e))
        }, 500) // Debounce 500ms

        return () => clearTimeout(timer)
    }, [pageTitle, openInNewTab, bgConfig, logoConfig, iconConfig, layoutConfig, titleConfig, registryUrls, configLoaded])

    // Dynamic Page Title
    useEffect(() => {
        document.title = pageTitle || 'ER-Startseite'
    }, [pageTitle])

    // Helper to generate icon style

    // Helper to generate icon style
    const getIconStyle = () => {
        const style: React.CSSProperties & { [key: string]: string } = {}

        // Background Logic
        const opacity = iconConfig.backgroundOpacity !== undefined ? iconConfig.backgroundOpacity / 100 : 0.1

        if (iconConfig.backgroundStyle === 'glass') {
            // For Glass, we explicity clear inline styles to let CSS .glass-panel class take over
            style.background = undefined
            style.backgroundColor = undefined
            style.backdropFilter = undefined
        } else if (iconConfig.backgroundStyle === 'solid') {
            // Convert Hex to RGBA manually or just use opacity if it works
            const hex = iconConfig.backgroundColor.replace('#', '')
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)

            if (!isNaN(r)) {
                style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`
            } else {
                style.background = iconConfig.backgroundColor
            }
            style.backdropFilter = 'none'
        } else if (iconConfig.backgroundStyle === 'gradient') {
            // Gradients + Opacity
            const hex1 = iconConfig.gradientColors[0].replace('#', '')
            const r1 = parseInt(hex1.substring(0, 2), 16)
            const g1 = parseInt(hex1.substring(2, 4), 16)
            const b1 = parseInt(hex1.substring(4, 6), 16)

            const hex2 = iconConfig.gradientColors[1].replace('#', '')
            const r2 = parseInt(hex2.substring(0, 2), 16)
            const g2 = parseInt(hex2.substring(2, 4), 16)
            const b2 = parseInt(hex2.substring(4, 6), 16)

            if (!isNaN(r1) && !isNaN(r2)) {
                style.background = `linear-gradient(135deg, rgba(${r1},${g1},${b1},${opacity}), rgba(${r2},${g2},${b2},${opacity}))`
            } else {
                style.background = `linear-gradient(135deg, ${iconConfig.gradientColors[0]}, ${iconConfig.gradientColors[1]})`
            }

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

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Move App to Folder
    const moveAppToFolder = async (app: AppData, folder: AppData) => {
        try {
            // Updated contents
            const newContents = [...(folder.contents || []), app]

            // Update Folder
            const resFolder = await fetch(`/api/v1/apps/${folder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...folder, contents: newContents })
            })

            if (!resFolder.ok) throw new Error("Failed to update folder")

            // Delete specific app from root
            const resDelete = await fetch(`/api/v1/apps/${app.id}`, { method: 'DELETE' })
            if (!resDelete.ok) throw new Error("Failed to remove app from root")

            // Refresh
            fetchApps()
        } catch (e) {
            console.error("Move to folder failed", e)
            alert("Failed to move app to folder")
        }
    }

    // Delete App from Folder
    const handleDeleteFromFolder = async (folderId: string, appId: string) => {
        if (!confirm("Remove app from folder?")) return
        try {
            const folder = apps.find(a => a.id === folderId)
            if (!folder) return

            const newContents = folder.contents?.filter(a => a.id !== appId) || []

            // Update Folder
            const resFolder = await fetch(`/api/v1/apps/${folder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...folder, contents: newContents })
            })

            if (!resFolder.ok) throw new Error("Failed to update folder")

            fetchApps()

            // Update openFolder state to reflect changes immediately
            if (openFolder?.id === folderId) {
                setOpenFolder({ ...folder, contents: newContents })
            }
        } catch (e) {
            console.error("Failed to delete from folder", e)
        }
    }

    // Move App from Folder to Root
    const handleMoveFromFolderToRoot = async (folderId: string, app: AppData) => {
        if (!confirm("Move app to main grid?")) return
        try {
            const folder = apps.find(a => a.id === folderId)
            if (!folder) return

            // 1. Remove from Folder
            const newContents = folder.contents?.filter(a => a.id !== app.id) || []

            const resFolder = await fetch(`/api/v1/apps/${folder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...folder, contents: newContents })
            })

            if (!resFolder.ok) throw new Error("Failed to update folder")

            // 2. Create at Root
            // We strip 'id' to let backend assign a new one
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...appData } = app

            const resCreate = await fetch('/api/v1/apps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appData)
            })

            if (!resCreate.ok) throw new Error("Failed to create app at root")

            fetchApps()

            // Update openFolder state
            if (openFolder?.id === folderId) {
                setOpenFolder({ ...folder, contents: newContents })
            }

        } catch (e) {
            console.error("Failed to move to root", e)
            alert("Failed to move app to root")
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        if (activeId === overId) return

        // Check if dropping into folder
        let targetFolderId: string | null = null
        if (overId.startsWith('folder-drop-')) {
            targetFolderId = overId.replace('folder-drop-', '')
        } else {
            const potentialFolder = apps.find(a => a.id === overId)
            if (potentialFolder?.type === 'folder') {
                targetFolderId = overId
            }
        }

        if (targetFolderId) {
            const folder = apps.find(a => a.id === targetFolderId)
            const activeApp = apps.find(a => a.id === activeId)

            if (folder && activeApp && activeApp.id !== folder.id) {
                if (activeApp.type === 'folder') {
                    alert("Nested folders are not supported yet.")
                    return
                }
                moveAppToFolder(activeApp, folder)
                return
            }
        }

        // Check for Hidden Apps Interaction (Grid/List Mode)
        const isHiddenAppsDrop = overId === 'hidden-apps' || (layoutConfig.hiddenAppIds || []).includes(overId)
        const isFromHiddenApps = (layoutConfig.hiddenAppIds || []).includes(activeId)

        if (isHiddenAppsDrop || isFromHiddenApps) {
            // Moving TO Hidden Apps
            if (!isFromHiddenApps && isHiddenAppsDrop) {
                if (confirm("Hide this app?")) {
                    setLayoutConfig(prev => ({
                        ...prev,
                        hiddenAppIds: [...(prev.hiddenAppIds || []), activeId]
                    }))
                }
                return
            }

            // Moving FROM Hidden Apps TO Grid (Uncategorized)
            if (isFromHiddenApps && !isHiddenAppsDrop) {
                if (confirm("Unhide this app?")) {
                    setLayoutConfig(prev => ({
                        ...prev,
                        hiddenAppIds: prev.hiddenAppIds?.filter(id => id !== activeId) || []
                    }))
                }
                return
            }

            // Reordering WITHIN Hidden Apps
            if (isFromHiddenApps && isHiddenAppsDrop && activeId !== overId) {
                const oldIndex = layoutConfig.hiddenAppIds?.indexOf(activeId) ?? -1
                const newIndex = layoutConfig.hiddenAppIds?.indexOf(overId) ?? -1

                if (oldIndex !== -1 && newIndex !== -1) {
                    setLayoutConfig(prev => ({
                        ...prev,
                        hiddenAppIds: arrayMove(prev.hiddenAppIds || [], oldIndex, newIndex)
                    }))
                }
                return
            }
        }

        if (active.id !== over.id) {
            setApps((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)
                if (oldIndex === -1 || newIndex === -1) return items

                const newOrder = arrayMove(items, oldIndex, newIndex)

                // Update customOrder in layoutConfig
                const newOrderIds = newOrder.map(app => app.id)
                setLayoutConfig(prev => ({ ...prev, customOrder: newOrderIds }))

                return newOrder
            })
        }
    }

    // Helper for secure/non-secure contexts
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Category Logic ---

    // Add Category
    const handleAddCategory = () => {
        const name = prompt("Category Name:")
        if (name) {
            setLayoutConfig(prev => ({
                ...prev,
                categories: [...prev.categories, { id: generateUUID(), name, app_ids: [] }]
            }))
        }
    }

    // Rename Category
    const handleRenameCategory = (id: string) => {
        const cat = layoutConfig.categories.find(c => c.id === id)
        if (!cat) return
        const newName = prompt("New Name:", cat.name)
        if (newName) {
            setLayoutConfig(prev => ({
                ...prev,
                categories: prev.categories.map(c => c.id === id ? { ...c, name: newName } : c)
            }))
        }
    }

    // Delete Category (move apps to uncategorized)
    const handleDeleteCategory = (id: string) => {
        if (!confirm("Delete this category? Apps will match to Uncategorized.")) return
        setLayoutConfig(prev => ({
            ...prev,
            categories: prev.categories.filter(c => c.id !== id)
        }))
    }



    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        // Find which container the items are in
        const findContainerId = (id: string) => {
            const cat = layoutConfig.categories.find(c => c.app_ids.includes(id));
            if (cat) return cat.id;
            if (layoutConfig.hiddenAppIds && layoutConfig.hiddenAppIds.includes(id)) return 'hidden-apps'; // Check hidden
            if (layoutConfig.customOrder.includes(id) || apps.find(a => a.id === id)) return 'uncategorized';
            return null;
        };

        const activeContainer = findContainerId(activeId);
        const overContainer = findContainerId(overId);

        // If overId is a container itself
        const isOverContainer = overId === 'uncategorized' || overId === 'hidden-apps' || layoutConfig.categories.some(c => c.id === overId);
        const targetContainer = isOverContainer ? overId : overContainer;

        if (!activeContainer || !targetContainer || activeContainer === targetContainer) {
            return;
        }

        // Move item to new container in state
        setLayoutConfig(prev => {
            // Remove from source
            let newCategories = prev.categories.map(c => ({
                ...c,
                app_ids: c.app_ids.filter(id => id !== activeId)
            }));
            const newHiddenAppIds = prev.hiddenAppIds ? prev.hiddenAppIds.filter(id => id !== activeId) : [];

            // Add to target
            if (targetContainer === 'uncategorized') {
                // Implicitly uncategorized
            } else if (targetContainer === 'hidden-apps') {
                // Add to hidden apps
                if (!newHiddenAppIds.includes(activeId)) {
                    newHiddenAppIds.push(activeId);
                }
            } else {
                newCategories = newCategories.map(c => {
                    if (c.id === targetContainer) {
                        const overIndex = c.app_ids.indexOf(overId);
                        const newAppIds = [...c.app_ids];
                        if (overIndex >= 0) {
                            newAppIds.splice(overIndex, 0, activeId);
                        } else {
                            newAppIds.push(activeId);
                        }
                        return { ...c, app_ids: newAppIds };
                    }
                    return c;
                });
            }

            return { ...prev, categories: newCategories, hiddenAppIds: newHiddenAppIds };
        });
    };



    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeAppId = active.id as string;
        const overId = over.id as string;

        if (activeAppId === overId) return;

        // Helper to find container of an app ID
        const findContainerId = (id: string): string => {
            const cat = layoutConfig.categories.find(c => c.app_ids.includes(id));
            if (cat) return cat.id;
            if (layoutConfig.hiddenAppIds && layoutConfig.hiddenAppIds.includes(id)) return 'hidden-apps';
            return 'uncategorized';
        };

        const activeContainer = findContainerId(activeAppId);
        const overContainer = findContainerId(overId);

        // Check for Folder Drop first
        let targetFolderId: string | null = null
        if (overId.startsWith('folder-drop-')) {
            targetFolderId = overId.replace('folder-drop-', '')
        } else {
            const potentialFolder = apps.find(a => a.id === overId)
            if (potentialFolder?.type === 'folder') {
                targetFolderId = overId
            }
        }

        if (targetFolderId) {
            const folder = apps.find(a => a.id === targetFolderId)
            const activeApp = apps.find(a => a.id === activeAppId)

            if (folder && activeApp && activeApp.id !== folder.id) {
                if (activeApp.type === 'folder') {
                    alert("Nested folders are not supported yet.")
                    return
                }
                moveAppToFolder(activeApp, folder)

                // Cleanup from layout config
                setLayoutConfig(prev => {
                    const newCategories = prev.categories.map(c => ({
                        ...c,
                        app_ids: c.app_ids.filter(id => id !== activeAppId)
                    }));
                    const newHiddenAppIds = prev.hiddenAppIds ? prev.hiddenAppIds.filter(id => id !== activeAppId) : [];
                    return { ...prev, categories: newCategories, hiddenAppIds: newHiddenAppIds }
                })
                return
            }
        }

        const overCategory = layoutConfig.categories.find(c => c.id === overId);
        const isOverHidden = overId === 'hidden-apps';

        let targetContainer = overContainer;
        if (overCategory) targetContainer = overCategory.id;
        if (isOverHidden) targetContainer = 'hidden-apps';

        if (activeContainer === targetContainer) {
            // Reorder within same container
            if (activeContainer === 'uncategorized') {
                return; // already handled or n/a
            } else if (activeContainer === 'hidden-apps') {
                // Reorder within hidden apps
                setLayoutConfig(prev => {
                    const oldIndex = prev.hiddenAppIds.indexOf(activeAppId);
                    const newIndex = prev.hiddenAppIds.indexOf(overId);
                    return {
                        ...prev,
                        hiddenAppIds: arrayMove(prev.hiddenAppIds, oldIndex, newIndex)
                    }
                })
            } else {
                // Reorder within category
                setLayoutConfig(prev => {
                    const cat = prev.categories.find(c => c.id === activeContainer)!;
                    const oldIndex = cat.app_ids.indexOf(activeAppId);
                    const newIndex = overCategory ? cat.app_ids.length : cat.app_ids.indexOf(overId);

                    const newAppIds = arrayMove(cat.app_ids, oldIndex, newIndex);

                    return {
                        ...prev,
                        categories: prev.categories.map(c => c.id === activeContainer ? { ...c, app_ids: newAppIds } : c)
                    };
                });
            }
        } else {
            // Move between containers (logic mostly handled in dragOver, but final clean up if needed)
            // Usually DragOver handles the visual move, DragEnd commits it if we were doing interim updates.
            // Since we update state in DragOver, DragEnd might just need to ensure consistency or do nothing if state is already updated.
            // BUT dnd-kit recommends final reorder in DragEnd.
            // Given our DragOver logic updates state "live", we might be okay.
            // However, for cross-container, we should ensure the item is definitely in the right place.

            // Let's rely on DragOver for the cross-container state mutation as it provides the 'preview'.
            // We can duplicate the logic here or just leave it if DragOver is sufficient.
            // For robustness, let's keep the logic consistent with DragOver but as a final commit.

            setLayoutConfig(prev => {
                // Remove from source
                let newCategories = prev.categories.map(c => ({
                    ...c,
                    app_ids: c.app_ids.filter(id => id !== activeAppId)
                }));
                const newHiddenAppIds = prev.hiddenAppIds ? prev.hiddenAppIds.filter(id => id !== activeAppId) : [];

                // Add to target
                if (targetContainer === 'uncategorized') {
                    // ...
                } else if (targetContainer === 'hidden-apps') {
                    if (!newHiddenAppIds.includes(activeAppId)) {
                        const newIndex = isOverHidden ? newHiddenAppIds.length : newHiddenAppIds.indexOf(overId);
                        if (newIndex === -1) newHiddenAppIds.push(activeAppId);
                        else newHiddenAppIds.splice(newIndex, 0, activeAppId);
                    }
                } else {
                    newCategories = newCategories.map(c => {
                        if (c.id === targetContainer) {
                            const newIndex = overCategory ? c.app_ids.length : c.app_ids.indexOf(overId);
                            const newAppIds = [...c.app_ids];
                            if (newIndex === -1) newAppIds.push(activeAppId);
                            else newAppIds.splice(newIndex, 0, activeAppId);
                            return { ...c, app_ids: newAppIds };
                        }
                        return c;
                    });
                }
                return { ...prev, categories: newCategories, hiddenAppIds: newHiddenAppIds };
            });
        }
    };


    // Filter and Sort Apps for Grid/List View
    let displayApps = apps;

    // 1. Filter Hidden Apps
    if (layoutConfig.hiddenAppIds && layoutConfig.hiddenAppIds.length > 0) {
        displayApps = displayApps.filter(a => !layoutConfig.hiddenAppIds.includes(a.id));
    }

    // 2. Filter Search
    if (searchQuery) {
        displayApps = displayApps.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // 3. Custom Sort (only if no search)
    else if (layoutConfig.customOrder.length > 0) {
        displayApps = [...displayApps].sort((a, b) => {
            const indexA = layoutConfig.customOrder.indexOf(a.id);
            const indexB = layoutConfig.customOrder.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }

    // Only verify app list with customOrder on load/fetch
    useEffect(() => {
        if (apps.length > 0 && layoutConfig.customOrder.length > 0) {
            // Logic handled in render currently, but could sync state here if needed
        }
    }, [apps, layoutConfig.customOrder])

    const handleContextMenu = (e: React.MouseEvent, app: AppData) => {
        if (!isEditMode) {
            e.preventDefault()
            e.stopPropagation() // Ensure no bubble up
            setDetailsApp(app)
        }
    }

    const handleAddWidget = (type: 'weather' | 'clock' | 'search' | 'calendar' | 'text') => {
        const newWidget: WidgetData = {
            id: `widget-${type}-${generateUUID()}`,
            type,
            x: 0, y: 0, w: 1, h: 1 // Default size
        }
        setLayoutConfig(prev => ({
            ...prev,
            widgets: [...(prev.widgets || []), newWidget]
        }))
    }

    const handleDeleteWidget = (id: string) => {
        if (!confirm("Remove this widget?")) return
        setLayoutConfig(prev => ({
            ...prev,
            widgets: prev.widgets.filter(w => w.id !== id)
        }))
    }

    const renderContent = () => {
        if (activeLayoutMode === 'categories') {
            const hasSearch = searchQuery.length > 0;
            const searchLower = searchQuery.toLowerCase();

            // Filter Uncategorized
            let uncategorized = apps.filter(app => {
                const inCategory = layoutConfig.categories.some(c => c.app_ids.includes(app.id));
                const inHidden = layoutConfig.hiddenAppIds && layoutConfig.hiddenAppIds.includes(app.id);
                return !inCategory && !inHidden;
            });
            if (hasSearch) {
                uncategorized = uncategorized.filter(app => app.name.toLowerCase().includes(searchLower));
            }

            // Filter Categories
            // Show category if:
            // 1. It has apps that match the search
            // 2. OR (optional) if the category name matches? The user asked for "Kategorien... die... beinhalten", so maybe just apps.
            // Let's stick to apps for now as requested: "show categories which contain the searched apps"

            const visibleCategories = layoutConfig.categories.map(cat => {
                const catApps = cat.app_ids.map(id => apps.find(a => a.id === id)).filter((a): a is AppData => !!a);

                let matchingApps = catApps;

                // Filter Hidden
                if (layoutConfig.hiddenAppIds) {
                    matchingApps = matchingApps.filter(app => !layoutConfig.hiddenAppIds.includes(app.id));
                }

                // If searching, filter apps inside the category
                if (hasSearch) {
                    matchingApps = matchingApps.filter(app => app.name.toLowerCase().includes(searchLower));
                }

                return { ...cat, matchingApps };
            }).filter(group => !hasSearch || group.matchingApps.length > 0);


            return (
                <div className="flex flex-col gap-8 max-w-6xl mx-auto p-6 pb-24">
                    {/* Categories */}
                    {visibleCategories.map(cat => (
                        <div key={cat.id} className="glass-panel rounded-2xl p-6 border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-neon-cyan flex items-center gap-2">
                                    <Folder className="w-5 h-5" />
                                    {cat.name}
                                </h2>
                                {isEditMode && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRenameCategory(cat.id)} className="p-1.5 hover:bg-white/10 rounded transition">
                                            <Pencil className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 hover:bg-red-500/20 rounded transition text-red-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <SortableContext items={cat.app_ids} strategy={rectSortingStrategy}>
                                <DroppableContainer id={cat.id} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[100px] p-2 rounded-xl bg-black/20">
                                    {cat.matchingApps.map((app: AppData) => (
                                        <SortableAppTile
                                            key={app.id}
                                            app={app}
                                            isEditMode={isEditMode}
                                            tileClass={tileClass}
                                            style={layoutConfig.mode === 'rich-grid' ? {} : getIconStyle()}
                                            onClick={(e: React.MouseEvent) => {
                                                if (app.type === 'folder') {
                                                    e.preventDefault();
                                                    setOpenFolder(app);
                                                    return;
                                                }
                                                if (isEditMode) e.preventDefault();
                                                else if (app.url) {
                                                    if (openInNewTab) window.open(app.url, '_blank', 'noopener,noreferrer');
                                                    else window.location.href = app.url;
                                                }
                                            }}
                                            onDelete={handleDeleteApp}
                                            onEdit={(_e, app) => {
                                                setEditingApp(app);
                                                setIsAppFormOpen(true);
                                            }}
                                            onContextMenu={handleContextMenu}
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0">
                                                <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                            </div>
                                            <span className="font-medium text-gray-200 text-center text-sm truncate w-full px-2">{app.name}</span>
                                        </SortableAppTile>
                                    ))}
                                    {cat.matchingApps.length === 0 && !hasSearch && (
                                        <div className="col-span-full h-full flex items-center justify-center text-gray-500 text-sm italic py-8">
                                            Drag apps here
                                        </div>
                                    )}
                                </DroppableContainer>
                            </SortableContext>
                        </div>
                    ))}

                    {/* Hidden Apps Area */}
                    {showHiddenApps && (
                        <div className="glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-900/10">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                                    <EyeOff className="w-5 h-5" />
                                    Hidden Apps
                                </h2>
                            </div>
                            <SortableContext items={layoutConfig.hiddenAppIds || []} strategy={rectSortingStrategy}>
                                <DroppableContainer id="hidden-apps" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[100px] p-2 rounded-xl bg-black/20 border-dashed border border-red-500/20">
                                    {(layoutConfig.hiddenAppIds || []).map((id) => {
                                        const app = apps.find(a => a.id === id);
                                        if (!app) return null;
                                        // Filter by search query
                                        if (searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                                            return null;
                                        }
                                        return (
                                            <SortableAppTile
                                                key={app.id}
                                                app={app}
                                                isEditMode={isEditMode}
                                                tileClass={tileClass}
                                                style={getIconStyle()}
                                                onClick={(e: React.MouseEvent) => {
                                                    if (isEditMode) e.preventDefault();
                                                    else if (app.type === 'folder') setOpenFolder(app);
                                                    else if (app.url) {
                                                        if (openInNewTab) window.open(app.url, '_blank', 'noopener,noreferrer');
                                                        else window.location.href = app.url;
                                                    }
                                                }}
                                                onDelete={handleDeleteApp}
                                                onEdit={(_e, app) => {
                                                    setEditingApp(app);
                                                    setIsAppFormOpen(true);
                                                }}
                                                onContextMenu={handleContextMenu}
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0 opacity-70">
                                                    <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain grayscale" />
                                                </div>
                                                <span className="font-medium text-gray-400 text-center text-sm truncate w-full px-2">{app.name}</span>
                                            </SortableAppTile>
                                        )
                                    })}
                                    {(!layoutConfig.hiddenAppIds || layoutConfig.hiddenAppIds.length === 0) && (
                                        <div className="col-span-full h-full flex items-center justify-center text-red-400/50 text-sm italic py-8">
                                            Drag apps here to hide them
                                        </div>
                                    )}
                                </DroppableContainer>
                            </SortableContext>
                        </div>
                    )}

                    {/* Uncategorized */}
                    {(uncategorized.length > 0 || !hasSearch) && (
                        <div className="glass-panel rounded-2xl p-6 border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-400">Uncategorized</h2>
                                {isEditMode && !hasSearch && (
                                    <button onClick={handleAddCategory} className="flex items-center gap-2 px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition text-sm font-medium">
                                        <PlusCircle className="w-4 h-4" />
                                        New Category
                                    </button>
                                )}
                            </div>
                            <SortableContext items={uncategorized.map(a => a.id)} strategy={rectSortingStrategy}>
                                <DroppableContainer id="uncategorized" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {uncategorized.map((app: AppData) => (
                                        <SortableAppTile
                                            key={app.id}
                                            app={app}
                                            isEditMode={isEditMode}
                                            tileClass={tileClass}
                                            style={getIconStyle()}
                                            onClick={(e: React.MouseEvent) => {
                                                if (isEditMode) e.preventDefault();
                                                else if (app.type === 'folder') setOpenFolder(app);
                                                else if (app.url) {
                                                    if (openInNewTab) window.open(app.url, '_blank', 'noopener,noreferrer');
                                                    else window.location.href = app.url;
                                                }
                                            }}
                                            onDelete={handleDeleteApp}
                                            onEdit={(_e, app) => {
                                                setEditingApp(app);
                                                setIsAppFormOpen(true);
                                            }}
                                            onContextMenu={handleContextMenu}
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0">
                                                <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                            </div>
                                            <span className="font-medium text-gray-200 text-center text-sm truncate w-full px-2">{app.name}</span>
                                        </SortableAppTile>
                                    ))}
                                    {/* Widgets in Category Mode (Uncategorized Area) */}
                                    {layoutConfig.widgets && layoutConfig.widgets.map(widget => (
                                        <WidgetTile
                                            key={widget.id}
                                            widget={widget}
                                            isEditMode={isEditMode}
                                            onDelete={handleDeleteWidget}
                                            onContextMenu={(e) => {
                                                e.preventDefault()
                                                setContextWidget(widget)
                                            }}
                                        >
                                            {widget.type === 'weather' && <WeatherWidget />}
                                            {widget.type === 'clock' && <ClockWidget />}
                                            {widget.type === 'calendar' && <CalendarWidget />}
                                        </WidgetTile>
                                    ))}
                                </DroppableContainer>
                            </SortableContext>
                        </div>
                    )}
                </div>
            )
        }

        // Default Grid/List View
        return (
            <SortableContext items={displayApps.map(app => app.id)} strategy={rectSortingStrategy}>
                <DroppableContainer
                    id="uncategorized"
                    className={`p-6 pb-24 gap-6 ${activeLayoutMode === 'list'
                        ? 'flex flex-col max-w-3xl mx-auto'
                        : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
                        }`}
                >
                    {displayApps.map((app) => (
                        <SortableAppTile
                            key={app.id}
                            app={app}
                            isEditMode={isEditMode}
                            tileClass={activeLayoutMode === 'rich-grid' ? '' : (activeLayoutMode === 'list'
                                ? "relative rounded-xl p-4 flex items-center gap-4 transition-all duration-300 cursor-pointer group hover:bg-white/5 glass-panel w-full"
                                : tileClass)}
                            style={activeLayoutMode === 'rich-grid' ? {
                                backgroundColor: 'transparent',
                                boxShadow: 'none',
                                border: 'none'
                            } : getIconStyle()}
                            onClick={(e: React.MouseEvent) => {
                                if (app.type === 'folder') {
                                    e.preventDefault();
                                    setOpenFolder(app);
                                    return;
                                }
                                if (isEditMode) e.preventDefault();
                                else if (app.url) {
                                    if (openInNewTab) window.open(app.url, '_blank', 'noopener,noreferrer');
                                    else window.location.href = app.url;
                                }
                            }}
                            onDelete={handleDeleteApp}
                            onEdit={(_e, app) => {
                                setEditingApp(app);
                                setIsAppFormOpen(true);
                            }}
                            onContextMenu={handleContextMenu}
                        >
                            {activeLayoutMode === 'rich-grid' ? (
                                <RichAppTile
                                    app={app}
                                    onClick={() => {
                                        if (app.type === 'folder') {
                                            setOpenFolder(app);
                                            return;
                                        }
                                        if (!isEditMode && app.url) {
                                            if (openInNewTab) window.open(app.url, '_blank', 'noopener,noreferrer');
                                            else window.location.href = app.url;
                                        }
                                    }}
                                    onContextMenu={(e) => { e.preventDefault(); }}
                                    isEditMode={isEditMode}
                                    isAuthenticated={isAuthenticated}
                                    iconConfig={iconConfig}
                                />
                            ) : activeLayoutMode === 'compact' ? (
                                <div className="flex items-center gap-3 w-full h-full p-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 p-1.5 flex-shrink-0">
                                        <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="font-medium text-gray-200 text-sm truncate">{app.name}</span>
                                </div>
                            ) : (
                                <>
                                    <div className={`${activeLayoutMode === 'list' ? 'w-12 h-12' : 'w-16 h-16'} rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0`}>
                                        <AppIcon
                                            src={app.icon_url}
                                            alt={app.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className={`flex flex-col min-w-0 ${activeLayoutMode === 'list' ? 'flex-1 items-start' : 'items-center w-full'}`}>
                                        <span className={`font-medium text-gray-200 group-hover:text-white ${activeLayoutMode === 'list' ? 'text-lg text-left' : 'text-center text-sm'} truncate w-full px-2`}>
                                            {app.name}
                                        </span>
                                        {activeLayoutMode === 'list' && app.description && (
                                            <span className="text-sm text-gray-400 truncate w-full px-2 text-left">
                                                {app.description}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </SortableAppTile>
                    ))}

                    {/* Widgets in Grid Mode */}
                    {layoutConfig.widgets?.map(widget => (
                        <WidgetTile
                            key={widget.id}
                            widget={widget}
                            isEditMode={isEditMode}
                            onDelete={handleDeleteWidget}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                setContextWidget(widget)
                            }}
                        >
                            {widget.type === 'weather' && <WeatherWidget />}
                            {widget.type === 'clock' && <ClockWidget />}
                            {widget.type === 'calendar' && <CalendarWidget />}
                        </WidgetTile>
                    ))}

                    {/* Hidden Apps Area */}
                    {showHiddenApps && (
                        <div className={`glass-panel rounded-2xl p-6 border border-red-500/30 bg-red-900/10 ${layoutConfig.mode === 'list' ? 'col-span-full' : 'col-span-full'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                                    <EyeOff className="w-5 h-5" />
                                    Hidden Apps
                                </h2>
                                <p className="text-xs text-red-300/70">
                                    Visible because you are authenticated.
                                </p>
                            </div>
                            <SortableContext items={layoutConfig.hiddenAppIds || []} strategy={rectSortingStrategy}>
                                <DroppableContainer id="hidden-apps" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[100px] p-2 rounded-xl bg-black/20 border-dashed border border-red-500/20">
                                    {(layoutConfig.hiddenAppIds || []).map((id) => {
                                        const app = apps.find(a => a.id === id);
                                        if (!app) return null;
                                        // Filter by search query
                                        if (searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                                            return null;
                                        }
                                        return (
                                            <SortableAppTile
                                                key={app.id}
                                                app={app}
                                                isEditMode={isEditMode}
                                                tileClass={tileClass}
                                                style={getIconStyle()}
                                                onClick={(e: React.MouseEvent) => {
                                                    if (app.type === 'folder') {
                                                        e.preventDefault();
                                                        setOpenFolder(app);
                                                        return;
                                                    }
                                                    if (isEditMode) e.preventDefault();
                                                    else if (app.url) {
                                                        if (openInNewTab) window.open(app.url, '_blank', 'noopener,noreferrer');
                                                        else window.location.href = app.url;
                                                    }
                                                }}
                                                onDelete={handleDeleteApp}
                                                onEdit={(_e, app) => {
                                                    setEditingApp(app);
                                                    setIsAppFormOpen(true);
                                                }}
                                                onContextMenu={handleContextMenu}
                                            >
                                                <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0 opacity-70">
                                                    <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain grayscale" />
                                                </div>
                                                <span className="font-medium text-gray-400 text-center text-sm truncate w-full px-2">{app.name}</span>
                                            </SortableAppTile>
                                        )
                                    })}
                                    {(!layoutConfig.hiddenAppIds || layoutConfig.hiddenAppIds.length === 0) && (
                                        <div className="col-span-full h-full flex items-center justify-center text-red-400/50 text-sm italic py-8">
                                            Drag apps here to hide them
                                        </div>
                                    )}
                                </DroppableContainer>
                            </SortableContext>
                        </div>
                    )}
                </DroppableContainer>
            </SortableContext>
        )
    }

    if (isLoadingAuth) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
            </div>
        )
    }

    if (!isSetup) {
        return <SetupModal onSetupComplete={() => { setIsSetup(true); setIsAuthenticated(true); }} />
    }

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
                        key={bgConfig.value}
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

            {/* Widget Context Modal */}
            <WidgetContextModal
                widget={contextWidget}
                onClose={() => setContextWidget(null)}
                onDelete={handleDeleteWidget}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentTitle={pageTitle}
                onTitleChange={setPageTitle}
                bgConfig={bgConfig}
                onBgChange={setBgConfig}
                logoConfig={logoConfig}
                onLogoChange={setLogoConfig}
                iconConfig={iconConfig}
                onIconConfigChange={setIconConfig}
                titleConfig={titleConfig}
                onTitleConfigChange={setTitleConfig}
                openInNewTab={openInNewTab}
                onOpenInNewTabChange={setOpenInNewTab}
                onAddWidget={handleAddWidget}
                layoutMode={activeLayoutMode}
                onLayoutModeChange={handleLocalModeChange}
                onSaveAsDefault={handleSaveServerDefault}
                serverMode={layoutConfig.mode}
                onLogout={handleLogout}
            />

            <UnlockModal
                isOpen={showUnlockModal}
                onClose={() => setShowUnlockModal(false)}
                onUnlock={handleUnlockSuccess}
            />



            {/* Layout Menu Logic Adjustment: We treat "LayoutGrid" button as the entry to Edit/Layout Ops */}
            {/* If protected action 'edit' succeeds, what happens? */}
            {/* Strategy: 'edit' action opens LayoutMenu. LayoutMenu contains the "Enable Edit Mode" toggle. */}
            {/* Actually, user said "Edit apps" protected. Changing layout mode is also kind of editing config. */}
            {/* So protecting the Layout Menu open is correct. */}

            {isLayoutMenuOpen && (
                <LayoutMenu
                    isOpen={true}
                    onClose={() => setIsLayoutMenuOpen(false)}
                    currentMode={activeLayoutMode}
                    onModeChange={handleLocalModeChange}
                    isEditMode={isEditMode}
                    onToggleEditMode={() => handleProtectedAction('edit_mode')}
                    showHidden={showHiddenApps}
                    onToggleShowHidden={() => handleProtectedAction('show_hidden')}
                />
            )}



            {openFolder && (
                <FolderModal
                    folder={openFolder}
                    isOpen={!!openFolder}
                    onClose={() => setOpenFolder(null)}
                    onRequestAdd={() => {
                        setTargetFolderId(openFolder.id)
                        handleProtectedAction('add_app')
                    }}
                    isEditMode={isEditMode}
                    onDelete={(appId) => handleDeleteFromFolder(openFolder.id, appId)}
                    onMoveToRoot={(app) => handleMoveFromFolderToRoot(openFolder.id, app)}
                    onEdit={(_e, app) => {
                        setEditingApp(app);
                        setIsAppFormOpen(true);
                    }}
                    onContextMenu={handleContextMenu}
                    openInNewTab={openInNewTab}
                />
            )}

            <AppFormModal
                isOpen={isAppFormOpen}
                onClose={() => { setIsAppFormOpen(false); setEditingApp(null); }}
                editApp={editingApp}
                categories={layoutConfig.categories}
                onComplete={async (isHidden, appId, newApp, newCategoryId) => {
                    await fetchApps() // Refresh first to get the new app in state (eventually)

                    // Handle Category Logic
                    if (appId && newCategoryId !== undefined) {
                        try {
                            setLayoutConfig(prev => {
                                // 1. Remove from all categories
                                let newCategories = prev.categories.map(c => ({
                                    ...c,
                                    app_ids: c.app_ids.filter(id => id !== appId)
                                }))

                                // 2. Add to new category if specified
                                if (newCategoryId && newCategoryId !== '') {
                                    newCategories = newCategories.map(c => {
                                        if (c.id === newCategoryId && !c.app_ids.includes(appId)) {
                                            return { ...c, app_ids: [...c.app_ids, appId] }
                                        }
                                        return c
                                    })
                                }

                                return { ...prev, categories: newCategories }
                            })
                        } catch (e) {
                            console.error("Failed to update category", e)
                        }
                    }

                    if (targetFolderId && newApp) {
                        try {
                            // 1. Fetch current apps to get fresh folder data
                            const allApps = await fetch('/api/v1/apps').then(r => r.json())
                            const folder = allApps.find((a: AppData) => a.id === targetFolderId)

                            if (folder) {
                                // 2. Add new app to folder contents
                                const updatedContents = [...(folder.contents || []), newApp]

                                await fetch(`/api/v1/apps/${targetFolderId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ contents: updatedContents })
                                })

                                // 3. Delete the app from root (since it's now in folder)
                                // Only if it's not the folder itself (obv)
                                if (appId) {
                                    await fetch(`/api/v1/apps/${appId}`, { method: 'DELETE' })
                                }

                                // 4. Update UI
                                setOpenFolder({ ...folder, contents: updatedContents })
                                await fetchApps()
                            }
                        } catch (e) {
                            console.error("Failed to move app to folder", e)
                            alert("Failed to move app to folder")
                        }
                        setTargetFolderId(null)
                    } else if (isHidden && appId) {
                        // Immediately hide the app
                        setLayoutConfig(prev => {
                            const newHidden = [...(prev.hiddenAppIds || []), appId]
                            return { ...prev, hiddenAppIds: newHidden }
                        })
                    }
                }}
            />

            <AppDetailsModal
                app={detailsApp}
                isOpen={!!detailsApp}
                onClose={() => setDetailsApp(null)}
                isAuthenticated={isAuthenticated}
                onUnlock={() => setShowUnlockModal(true)}
            />

            {/* ================= MOBILE HEADER (Visible only on mobile) ================= */}
            <div className="md:hidden fixed top-0 left-0 w-full z-50 h-14 pointer-events-none">
                {/* Left: Logo & Title */}
                <div className="absolute top-2 left-2 flex items-center pointer-events-auto gap-2">
                    <AnimatedLogo
                        className="w-12 h-12"
                        src={logoConfig.type === 'image' ? logoConfig.value : undefined}
                    />
                    <h1 className={`text-xl font-bold tracking-tighter transition-all ml-0 ${titleConfig.style === 'default' ? 'text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple' : ''} ${titleConfig.style === 'gradient' ? 'text-transparent bg-clip-text' : titleConfig.style === 'solid' ? 'text-white' : ''}`}
                        style={{
                            textShadow: '0 0 10px rgba(6, 182, 212, 0.4)',
                            color: titleConfig.style === 'solid' ? titleConfig.color : undefined,
                            backgroundImage: titleConfig.style === 'gradient' ? `linear-gradient(to right, ${titleConfig.gradientColors?.[0]}, ${titleConfig.gradientColors?.[1]})` : undefined
                        }}>
                        {pageTitle}
                    </h1>
                </div>

                {/* Right: Settings Icons */}
                <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto items-center">
                    <button
                        onClick={() => handleProtectedAction('add_app')}
                        className="p-2 rounded-full glass-panel hover:bg-white/10 transition"
                        title="Add App"
                    >
                        <Plus className="w-5 h-5 text-neon-cyan" />
                    </button>
                    <button
                        onClick={() => setIsLayoutMenuOpen(true)}
                        className={`p-2 rounded-full glass-panel transition ${isLayoutMenuOpen ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/10 text-gray-400'}`}
                        title="Layout / Edit"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => handleProtectedAction('settings')}
                        className="p-2 rounded-full glass-panel hover:bg-white/10 transition"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5 text-neon-cyan" />
                    </button>
                </div>
            </div>

            {/* ================= DESKTOP HEADER (Visible only on desktop) ================= */}
            <div className="hidden md:flex absolute top-0 left-0 w-full z-20 p-4 pt-8 justify-between items-start pointer-events-none">
                {/* Left Spacer for Balance */}
                <div className="w-40"></div>

                {/* Center: Logo & Title */}
                <div className="flex flex-col items-center pointer-events-auto pt-2">
                    <div className="h-32 w-auto flex items-end justify-center pb-2">
                        <AnimatedLogo
                            className="h-full w-auto max-w-[250px]"
                            src={logoConfig.type === 'image' ? logoConfig.value : undefined}
                        />
                    </div>
                    <h1
                        className={`text-5xl font-bold tracking-tighter text-center transition-all mt-2 ${titleConfig.style === 'default' ? 'text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple' : ''} ${titleConfig.style === 'gradient' ? 'text-transparent bg-clip-text' : titleConfig.style === 'solid' ? 'text-white' : ''}`}
                        style={{
                            textShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
                            color: titleConfig.style === 'solid' ? titleConfig.color : undefined,
                            backgroundImage: titleConfig.style === 'gradient' ? `linear-gradient(to right, ${titleConfig.gradientColors?.[0]}, ${titleConfig.gradientColors?.[1]})` : undefined
                        }}
                    >
                        {pageTitle}
                    </h1>
                </div>

                {/* Right: Settings Buttons */}
                <div className="flex gap-4 pointer-events-auto w-40 justify-end p-2">
                    <button
                        onClick={() => handleProtectedAction('add_app')}
                        className="p-2 rounded-full glass-panel hover:bg-white/10 transition"
                        title="Add App"
                    >
                        <Plus className="w-6 h-6 text-neon-cyan" />
                    </button>
                    <button
                        onClick={() => setIsLayoutMenuOpen(true)}
                        className={`p-2 rounded-full glass-panel transition ${isLayoutMenuOpen ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/10 text-gray-400'}`}
                        title="Layout / Edit"
                    >
                        <LayoutGrid className="w-6 h-6" />
                    </button>

                    <button
                        onClick={() => handleProtectedAction('settings')}
                        className="p-2 rounded-full glass-panel hover:bg-white/10 transition"
                        title="Settings"
                    >
                        <Settings className="w-6 h-6 text-neon-cyan" />
                    </button>
                </div>
            </div>

            {/* Main Content (Padded) */}
            <div className="relative z-10 container mx-auto px-4 pt-[120px] md:pt-[320px] pb-4 flex flex-col h-screen overflow-hidden">

                {/* Search Field */}
                <div className="max-w-2xl w-full mx-auto mb-8 relative group shrink-0">
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

                {/* App Grid - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={pointerWithin}
                        onDragEnd={activeLayoutMode === 'categories' ? onDragEnd : handleDragEnd}
                        onDragOver={activeLayoutMode === 'categories' ? handleDragOver : undefined}
                    >
                        {renderContent()}
                    </DndContext>
                </div>
            </div>
        </div>
    )
}


function FolderModal({ folder, isOpen, onClose, onRequestAdd, isEditMode, onDelete, onMoveToRoot, openInNewTab, onEdit, onContextMenu }: { folder: AppData, isOpen: boolean, onClose: () => void, onRequestAdd: () => void, isEditMode: boolean, onDelete: (appId: string) => void, onMoveToRoot: (app: AppData) => void, openInNewTab: boolean, onEdit: (e: React.MouseEvent, app: AppData) => void, onContextMenu?: (e: React.MouseEvent, app: AppData) => void }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-[#0a0a0a]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg">
                            <Folder className="w-6 h-6 text-neon-cyan" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{folder.name}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar bg-black/20 min-h-[300px]">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {folder.contents?.map(app => (
                            <div key={app.id} className="group relative">
                                <a
                                    href={app.url}
                                    target={openInNewTab ? "_blank" : "_self"}
                                    rel={openInNewTab ? "noopener noreferrer" : undefined}
                                    onClick={(e) => { if (isEditMode) e.preventDefault(); }}
                                    onContextMenu={(e) => {
                                        if (onContextMenu) {
                                            e.preventDefault()
                                            onContextMenu(e, app)
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all group-hover:scale-105 ${isEditMode ? 'cursor-default' : ''}`}
                                >
                                    <div className="w-16 h-16 bg-black/40 rounded-2xl p-2 shadow-lg group-hover:shadow-neon-cyan/20 transition-all border border-white/5 group-hover:border-neon-cyan/30">
                                        <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain drop-shadow-md" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-200 group-hover:text-white text-center line-clamp-2">
                                        {app.name}
                                    </span>
                                </a>
                                {isEditMode && (
                                    <div className="absolute -top-3 -right-3 z-20 flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onEdit(e, app);
                                            }}
                                            className="bg-zinc-700 text-white p-1.5 rounded-full hover:bg-zinc-600 transition shadow-lg shrink-0 flex items-center justify-center transform hover:scale-110"
                                            title="Edit App"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onMoveToRoot(app);
                                            }}
                                            className="bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition shadow-lg shrink-0 flex items-center justify-center transform hover:scale-110"
                                            title="Move to Main Grid"
                                        >
                                            <ArrowUpFromLine className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onDelete(app.id);
                                            }}
                                            className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg shrink-0 flex items-center justify-center transform hover:scale-110"
                                            title="Delete"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add App Button */}
                        <button
                            onClick={onRequestAdd}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all group border-2 border-dashed border-white/10 hover:border-neon-cyan/50"
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8 text-gray-500 group-hover:text-neon-cyan" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 group-hover:text-neon-cyan">Add App</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default App
