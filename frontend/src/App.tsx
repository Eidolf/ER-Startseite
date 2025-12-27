import { useState, useEffect } from 'react'
import { AppIcon } from './components/AppIcon'
import { AnimatedLogo } from './components/AnimatedLogo'
import { Search, Settings, Plus, Trash2, LayoutGrid, Folder, PlusCircle, X, Pencil } from 'lucide-react'
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
    categories: []
}

function SortableAppTile({ app, isEditMode, tileClass, style, children, onClick, onDelete }: any) {
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

function App() {
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

    const [apps, setApps] = useState<any[]>([])
    const [isAddAppOpen, setIsAddAppOpen] = useState(false)

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
            if (layoutConfig.customOrder.includes(id) || apps.find(a => a.id === id)) return 'uncategorized';
            return null;
        };

        const activeContainer = findContainerId(activeId);
        const overContainer = findContainerId(overId);

        // If overId is a container itself
        const isOverContainer = overId === 'uncategorized' || layoutConfig.categories.some(c => c.id === overId);
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

            // Add to target
            if (targetContainer === 'uncategorized') {
                // Removed from cat, effectively becomes uncategorized
            } else {
                newCategories = newCategories.map(c => {
                    if (c.id === targetContainer) {
                        // If over container, add to end. If over item, insert at index.
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

            return { ...prev, categories: newCategories };
        });
    };



    // Update handleDragEnd to handle cross-category moves
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
            return 'uncategorized';
        };

        const activeContainer = findContainerId(activeAppId);
        const overContainer = findContainerId(overId); // This might be an app ID or a category ID (if dropped on header?)

        // If dropped on a category header/container directly (if we make them droppable)
        const overCategory = layoutConfig.categories.find(c => c.id === overId);
        const targetContainer = overCategory ? overCategory.id : overContainer;

        if (activeContainer === targetContainer) {
            // Reorder within same container
            if (activeContainer === 'uncategorized') {
                // Reorder uncategorized (using customOrder or just local sort? 
                // We should probably store uncategorized order in customOrder)
                setApps((items) => { // This setApps logic was for the main grid. 
                    // We should update layoutConfig instead.
                    return items;
                })
                // Actually, we need to update layoutConfig.
                // For simplicity, let's just support moving apps between categories for now, 
                // and maybe simple sorting later.
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
            // Move between containers
            setLayoutConfig(prev => {
                // Remove from source
                let newCategories = prev.categories.map(c => ({
                    ...c,
                    app_ids: c.app_ids.filter(id => id !== activeAppId)
                }));

                // Add to target
                if (targetContainer === 'uncategorized') {
                    // Just removing from categories puts it in uncategorized implicitly
                } else {
                    newCategories = newCategories.map(c => {
                        if (c.id === targetContainer) {
                            // Insert at specific index if dropped on an item, or end if dropped on container
                            const newIndex = overCategory ? c.app_ids.length : c.app_ids.indexOf(overId);
                            const newAppIds = [...c.app_ids];
                            if (newIndex === -1) newAppIds.push(activeAppId);
                            else newAppIds.splice(newIndex, 0, activeAppId);
                            return { ...c, app_ids: newAppIds };
                        }
                        return c;
                    });
                }

                return { ...prev, categories: newCategories };
            });
        }
    };


    // Filtered apps for display
    const filteredApps = apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // We only sort if NOT searching (or maybe we should?)
    // If searching, we usually want relevancy or just alphabetical.
    // Let's apply custom sort ONLY if search query is empty to avoid confusion.
    const displayApps = searchQuery ? filteredApps : (apps.length > 0 && layoutConfig.customOrder.length > 0 ? [...apps].sort((a, b) => {
        const indexA = layoutConfig.customOrder.indexOf(a.id);
        const indexB = layoutConfig.customOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    }) : apps);

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
            let uncategorized = apps.filter(app => !layoutConfig.categories.some(c => c.app_ids.includes(app.id)));
            if (hasSearch) {
                uncategorized = uncategorized.filter(app => app.name.toLowerCase().includes(searchLower));
            }

            // Filter Categories
            // Show category if: 
            // 1. It has apps that match the search
            // 2. OR (optional) if the category name matches? The user asked for "Kategorien... die... beinhalten", so maybe just apps.
            // Let's stick to apps for now as requested: "show categories which contain the searched apps"

            const visibleCategories = layoutConfig.categories.map(cat => {
                const catApps = cat.app_ids.map(id => apps.find(a => a.id === id)).filter(Boolean);

                // If searching, filter apps inside the category
                const matchingApps = hasSearch
                    ? catApps.filter(app => app.name.toLowerCase().includes(searchLower))
                    : catApps;

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
                                    {cat.matchingApps.map((app: any) => (
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
                                    {uncategorized.map((app: any) => (
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
                        onClick={() => setIsAddAppOpen(true)}
                        className={`glass-panel rounded-xl flex items-center justify-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-dashed border-2 border-white/20 ${layoutConfig.mode === 'list' ? 'w-full p-4 h-24' : 'flex-col p-6 min-h-[140px]'
                            }`}
                    >
                        <div className={`${layoutConfig.mode === 'list' ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-white/5 flex items-center justify-center`}>
                            <Plus className={`${layoutConfig.mode === 'list' ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} />
                        </div>
                        <span className="font-medium text-gray-400">Add App</span>
                    </div>
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

            <LayoutMenu
                isOpen={isLayoutMenuOpen}
                onClose={() => setIsLayoutMenuOpen(false)}
                currentMode={layoutConfig.mode}
                onModeChange={(mode) => setLayoutConfig({ ...layoutConfig, mode })}
                isEditMode={isEditMode}
                onToggleEditMode={() => setIsEditMode(!isEditMode)}
            />

            <AddAppModal
                isOpen={isAddAppOpen}
                onClose={() => setIsAddAppOpen(false)}
                onAdded={fetchApps}
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
                        title="Layout"
                    >
                        <LayoutGrid className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
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
