import { useState, useEffect } from 'react'
import { AppIcon } from './components/AppIcon'
import { AnimatedLogo } from './components/AnimatedLogo'
import { Search, Settings, Plus, Trash2, LayoutGrid, Folder, PlusCircle, X, Pencil, EyeOff } from 'lucide-react'
import { SettingsModal } from './components/SettingsModal'
import { LayoutMenu, LayoutMode } from './components/LayoutMenu'
import { DndContext, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Define Background Config Type
export interface BackgroundConfig {
    type: 'image' | 'video'
    value: string // URL or 'gradient'
}

// Define Logo Config Type
export interface LogoConfig {
    type: 'default' | 'image'
    value?: string
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

export interface Category {
    id: string
    name: string
    app_ids: string[]
}

export interface LayoutConfig {
    mode: LayoutMode
    customOrder: string[] // Array of App IDs
    categories: Category[]
    hiddenAppIds: string[]
}

const DEFAULT_BG: BackgroundConfig = {
    type: 'image',
    value: 'gradient'
}

const DEFAULT_LOGO_CONFIG: LogoConfig = {
    type: 'default',
    value: undefined
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

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    mode: 'grid',
    customOrder: [],
    categories: [],
    hiddenAppIds: []
}

export interface AppData {
    id: string
    name: string
    url: string
    icon_url: string
    description?: string
    default_icon?: string // For premium apps
}

interface SortableAppTileProps {
    app: AppData
    isEditMode: boolean
    tileClass: string
    style: React.CSSProperties
    children: React.ReactNode
    onClick: (e: React.MouseEvent) => void
    onDelete: (e: React.MouseEvent, id: string) => void
}

function SortableAppTile({ app, isEditMode, tileClass, style, children, onClick, onDelete }: SortableAppTileProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id, disabled: !isEditMode });

    const combinedStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...style,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        touchAction: 'none'
    };

    return (
        <div
            ref={setNodeRef}
            style={combinedStyle}
            {...attributes}
            {...listeners}
            className={`${tileClass} ${isEditMode ? 'cursor-grab active:cursor-grabbing animate-pulse' : ''}`}
            onClick={onClick}
        >
            {children}
            {isEditMode && (
                <button
                    onClick={(e) => onDelete(e, app.id)}
                    className="absolute -top-2 -right-2 z-20 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg shrink-0 flex items-center justify-center"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on delete button
                >
                    <Trash2 className="w-4 h-4" />
                </button>
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

function SetupModal({ onSetupComplete }: { onSetupComplete: () => void }) {
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (pin.length < 4) return alert("PIN must be at least 4 digits")
        setLoading(true)
        try {
            const res = await fetch('/api/v1/auth/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pin })
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="max-w-md w-full glass-panel border border-neon-cyan/30 p-8 rounded-2xl text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                        <Settings className="w-8 h-8 text-neon-cyan animate-spin-slow" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to ER-Startseite</h2>
                <p className="text-gray-400 mb-6">Please create a security PIN to protect your settings.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter 4-digit PIN"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:ring-2 focus:ring-neon-cyan outline-none"
                        maxLength={8}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading || pin.length < 4}
                        className="w-full bg-neon-cyan text-black font-bold py-3 rounded-xl hover:bg-cyan-400 transition disabled:opacity-50"
                    >
                        {loading ? 'Setting up...' : 'Set PIN & Start'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function UnlockModal({ isOpen, onClose, onUnlock }: { isOpen: boolean, onClose: () => void, onUnlock: () => void }) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setPin('')
            setError(false)
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
                body: JSON.stringify({ password: pin })
            })
            if (res.ok) {
                onUnlock()
                onClose()
            } else {
                setError(true)
                setPin('')
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
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setError(false); }}
                        placeholder="PIN"
                        className={`w-full bg-black/50 border ${error ? 'border-red-500 animate-pulse' : 'border-white/10'} rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] text-white focus:ring-2 focus:ring-neon-cyan outline-none`}
                        autoFocus
                    />
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

    const [configLoaded, setConfigLoaded] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false)

    // New State for Edit Mode
    const [isEditMode, setIsEditMode] = useState(false)
    const [showHiddenApps, setShowHiddenApps] = useState(false)

    const [apps, setApps] = useState<AppData[]>([])
    const [isAddAppOpen, setIsAddAppOpen] = useState(false)

    // Auth State
    const [isSetup, setIsSetup] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [showUnlockModal, setShowUnlockModal] = useState(false)
    const [pendingAction, setPendingAction] = useState<'settings' | 'layout_menu' | 'add_app' | 'edit_mode' | 'show_hidden' | null>(null)

    // Check Auth Status
    useEffect(() => {
        fetch('/api/v1/auth/status')
            .then(res => res.json())
            .then(data => {
                setIsSetup(data.is_setup)
            })
            .catch(e => console.error("Auth status check failed", e))
    }, [])

    const handleUnlockSuccess = () => {
        setIsAuthenticated(true)
        if (pendingAction === 'settings') setIsSettingsOpen(true)
        if (pendingAction === 'layout_menu') setIsLayoutMenuOpen(true)
        if (pendingAction === 'add_app') setIsAddAppOpen(true)
        if (pendingAction === 'edit_mode') setIsEditMode(prev => !prev)
        if (pendingAction === 'show_hidden') setShowHiddenApps(prev => !prev)
        setPendingAction(null)
    }

    const handleProtectedAction = (action: 'settings' | 'layout_menu' | 'add_app' | 'edit_mode' | 'show_hidden') => {
        if (isAuthenticated) {
            if (action === 'settings') setIsSettingsOpen(true)
            if (action === 'layout_menu') setIsLayoutMenuOpen(true)
            if (action === 'add_app') setIsAddAppOpen(true)
            if (action === 'edit_mode') setIsEditMode(prev => !prev)
            if (action === 'show_hidden') setShowHiddenApps(prev => !prev)
            return
        }
        setPendingAction(action)
        setShowUnlockModal(true)
    }

    // Fetch Config on Mount
    useEffect(() => {
        fetch('/api/v1/config')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setPageTitle(data.pageTitle || 'ER-Startseite')
                    setBgConfig(data.bgConfig || DEFAULT_BG)
                    setLogoConfig(data.logoConfig || DEFAULT_LOGO_CONFIG)
                    setIconConfig(data.iconConfig || DEFAULT_ICON_CONFIG)
                    setLayoutConfig(data.layoutConfig || DEFAULT_LAYOUT_CONFIG)
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
                    bgConfig,
                    logoConfig,
                    iconConfig,
                    layoutConfig
                })
            }).catch(e => console.error("Failed to save config", e))
        }, 500) // Debounce 500ms

        return () => clearTimeout(timer)
    }, [pageTitle, bgConfig, logoConfig, iconConfig, layoutConfig, configLoaded])

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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setApps((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)
                const newOrder = arrayMove(items, oldIndex, newIndex)

                // Update customOrder in layoutConfig
                const newOrderIds = newOrder.map(app => app.id)
                setLayoutConfig(prev => ({ ...prev, customOrder: newOrderIds }))

                return newOrder
            })
        }
    }

    // --- Category Logic ---

    // Add Category
    const handleAddCategory = () => {
        const name = prompt("Category Name:")
        if (name) {
            setLayoutConfig(prev => ({
                ...prev,
                categories: [...prev.categories, { id: crypto.randomUUID(), name, app_ids: [] }]
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

    const renderContent = () => {
        if (layoutConfig.mode === 'categories') {
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
                                            style={getIconStyle()}
                                            onClick={(e: React.MouseEvent) => {
                                                if (isEditMode) e.preventDefault();
                                                else window.location.href = app.url;
                                            }}
                                            onDelete={handleDeleteApp}
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
                                        return (
                                            <SortableAppTile
                                                key={app.id}
                                                app={app}
                                                isEditMode={isEditMode}
                                                tileClass={tileClass}
                                                style={getIconStyle()}
                                                onClick={(e: React.MouseEvent) => {
                                                    if (isEditMode) e.preventDefault();
                                                    else window.location.href = app.url;
                                                }}
                                                onDelete={handleDeleteApp}
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
                                                else window.location.href = app.url;
                                            }}
                                            onDelete={handleDeleteApp}
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0">
                                                <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                            </div>
                                            <span className="font-medium text-gray-200 text-center text-sm truncate w-full px-2">{app.name}</span>
                                        </SortableAppTile>
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
                <div className={`p-6 pb-24 gap-6 ${layoutConfig.mode === 'list'
                    ? 'flex flex-col max-w-3xl mx-auto'
                    : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
                    }`}>
                    {displayApps.map((app) => (
                        <SortableAppTile
                            key={app.id}
                            app={app}
                            isEditMode={isEditMode}
                            tileClass={layoutConfig.mode === 'list'
                                ? "relative rounded-xl p-4 flex items-center gap-4 transition-all duration-300 cursor-pointer group hover:bg-white/5 glass-panel w-full"
                                : tileClass}
                            style={getIconStyle()}
                            onClick={(e: React.MouseEvent) => {
                                if (isEditMode) e.preventDefault();
                                else window.location.href = app.url;
                            }}
                            onDelete={handleDeleteApp}
                        >
                            <div className={`${layoutConfig.mode === 'list' ? 'w-12 h-12' : 'w-16 h-16'} rounded-2xl bg-black/20 flex items-center justify-center p-2 overflow-hidden bg-white/5 shrink-0`}>
                                <AppIcon
                                    src={app.icon_url}
                                    alt={app.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className={`font-medium text-gray-200 group-hover:text-white ${layoutConfig.mode === 'list' ? 'text-lg text-left' : 'text-center text-sm'} truncate w-full px-2`}>
                                {app.name}
                            </span>
                        </SortableAppTile>
                    ))}

                    <div
                        onClick={() => handleProtectedAction('add_app')}
                        className={`glass-panel rounded-xl flex items-center justify-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-dashed border-2 border-white/20 ${layoutConfig.mode === 'list' ? 'w-full p-4 h-24' : 'flex-col p-6 min-h-[140px]'
                            }`}
                    >
                        <div className={`${layoutConfig.mode === 'list' ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-white/5 flex items-center justify-center`}>
                            <Plus className={`${layoutConfig.mode === 'list' ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} />
                        </div>
                        <span className="font-medium text-gray-400">Add App</span>
                    </div>

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
                                        return (
                                            <SortableAppTile
                                                key={app.id}
                                                app={app}
                                                isEditMode={isEditMode}
                                                tileClass={tileClass}
                                                style={getIconStyle()}
                                                onClick={(e: React.MouseEvent) => {
                                                    if (isEditMode) e.preventDefault();
                                                    else window.location.href = app.url;
                                                }}
                                                onDelete={handleDeleteApp}
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
                </div>
            </SortableContext>
        )
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
            />

            {!isSetup && (
                <SetupModal onSetupComplete={() => { setIsSetup(true); setIsAuthenticated(true); }} />
            )}

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
                    currentMode={layoutConfig.mode}
                    onModeChange={(mode) => setLayoutConfig({ ...layoutConfig, mode })}
                    isEditMode={isEditMode}
                    onToggleEditMode={() => handleProtectedAction('edit_mode')}
                    showHidden={showHiddenApps}
                    onToggleShowHidden={() => handleProtectedAction('show_hidden')}
                />
            )}

            <AddAppModal
                isOpen={isAddAppOpen}
                onClose={() => setIsAddAppOpen(false)}
                onAdded={async (isHidden, appId) => {
                    await fetchApps()
                    if (isHidden && appId) {
                        // Immediately hide the app
                        setLayoutConfig(prev => {
                            const newHidden = [...(prev.hiddenAppIds || []), appId]
                            return { ...prev, hiddenAppIds: newHidden }
                        })
                    }
                }}
            />

            {/* Top Fixed Header Area */}
            <div className="absolute top-0 left-0 w-full z-20 p-2 flex justify-between items-start pointer-events-none">
                {/* Left Spacer for Balance */}
                <div className="w-24"></div>

                {/* Center: Logo & Title */}
                <div className="flex flex-col items-center pointer-events-auto -mt-8">
                    {logoConfig.type === 'image' && logoConfig.value ? (
                        <div className="h-32 w-auto flex items-end justify-center pb-2">
                            <img src={logoConfig.value} alt="Logo" className="max-h-full w-auto max-w-[250px] object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                        </div>
                    ) : (
                        <AnimatedLogo />
                    )}
                    <h1
                        className={`text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-purple text-center transition-all ${logoConfig.type === 'image' && logoConfig.value ? 'mt-2' : '-mt-16'
                            }`}
                        style={{ textShadow: '0 0 15px rgba(6, 182, 212, 0.4)' }}
                    >
                        {pageTitle}
                    </h1>
                </div>

                {/* Right: Settings Buttons */}
                <div className="flex gap-4 pointer-events-auto w-24 justify-end p-2">
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
            <div className="relative z-10 container mx-auto px-4 pt-[220px] pb-4 flex flex-col h-screen overflow-hidden">

                {/* Search Field */}
                <div className="max-w-2xl w-full mx-auto mb-4 relative group shrink-0">
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
                        onDragEnd={layoutConfig.mode === 'categories' ? onDragEnd : handleDragEnd}
                        onDragOver={layoutConfig.mode === 'categories' ? handleDragOver : undefined}
                    >
                        {renderContent()}
                    </DndContext>
                </div>
            </div>
        </div>
    )
}

function AddAppModal({ isOpen, onClose, onAdded }: { isOpen: boolean, onClose: () => void, onAdded: (isHidden?: boolean, appId?: string) => void }) {
    const [activeTab, setActiveTab] = useState<'custom' | 'store'>('custom')
    const [premiumApps, setPremiumApps] = useState<AppData[]>([])
    const [selectedPremiumApp, setSelectedPremiumApp] = useState<AppData | null>(null)

    // Form State
    const [name, setName] = useState('')
    const [url, setUrl] = useState('')
    const [hideApp, setHideApp] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && activeTab === 'store') {
            fetch('/api/v1/apps/premium')
                .then(res => res.json())
                .then(data => setPremiumApps(data))
                .catch(e => console.error("Failed to load premium apps", e))
        }
    }, [isOpen, activeTab])

    const handleSelectPremium = (app: AppData) => {
        setSelectedPremiumApp(app)
        setName(app.name)
        setUrl('')
    }

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
            const body: { name: string; url: string; premium_id?: string } = { name, url: finalUrl }
            if (activeTab === 'store' && selectedPremiumApp) {
                body.premium_id = selectedPremiumApp.id
            }

            const res = await fetch('/api/v1/apps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (res.ok) {
                const newApp = await res.json()
                onAdded(hideApp, newApp.id)
                onClose()
                // Reset form
                setName('')
                setUrl('')
                setHideApp(false)
                setSelectedPremiumApp(null)
                setActiveTab('custom')
            }
        } catch (e) {
            console.error("Failed to add app", e)
        } finally {
            setLoading(false)
        }
    }

    // Determine what form content to show
    const renderFormContent = () => {
        if (activeTab === 'store' && !selectedPremiumApp) {
            // Store Grid
            return (
                <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                    {premiumApps.map(app => (
                        <div
                            key={app.id}
                            onClick={() => handleSelectPremium(app)}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-neon-cyan/50 rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all group"
                        >
                            <div className="w-12 h-12 bg-black/20 rounded-lg p-2 group-hover:scale-110 transition-transform">
                                <AppIcon src={app.default_icon} alt={app.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-medium text-white text-sm">{app.name}</h3>
                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{app.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        return (
            <div className="space-y-4">
                {selectedPremiumApp && (
                    <div className="flex items-center gap-3 bg-neon-cyan/10 border border-neon-cyan/20 p-3 rounded-lg mb-4">
                        <div className="w-10 h-10 bg-black/20 rounded-lg p-1.5 shrink-0">
                            <AppIcon src={selectedPremiumApp.default_icon} alt={selectedPremiumApp.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-neon-cyan">Configuring {selectedPremiumApp.name}</h4>
                            <button type="button" onClick={() => setSelectedPremiumApp(null)} className="text-xs text-gray-400 hover:text-white underline">Back to Store</button>
                        </div>
                    </div>
                )}

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
                        placeholder="https://..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-neon-cyan outline-none transition"
                    />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-white transition group relative">
                        <input
                            type="checkbox"
                            checked={hideApp}
                            onChange={(e) => setHideApp(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-black/40 text-neon-cyan focus:ring-neon-cyan/50"
                        />
                        <span>Hide this app immediately</span>
                    </label>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel">
                <div className="flex flex-col border-b border-white/10">
                    <div className="flex justify-between items-center px-6 py-4">
                        <h2 className="text-lg font-semibold text-white">Add New App</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                            <Plus className="w-5 h-5 rotate-45" />
                        </button>
                    </div>
                    {/* Tabs */}
                    <div className="flex px-6 gap-6">
                        <button
                            onClick={() => { setActiveTab('custom'); setSelectedPremiumApp(null); }}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'custom' ? 'text-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Custom URL
                            {activeTab === 'custom' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon-cyan shadow-[0_0_10px_#00f3ff]" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('store')}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'store' ? 'text-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            App Store
                            {activeTab === 'store' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-neon-cyan shadow-[0_0_10px_#00f3ff]" />}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {renderFormContent()}

                    {(activeTab === 'custom' || selectedPremiumApp) && (
                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add App'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}

export default App
