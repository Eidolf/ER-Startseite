import { AppData, IconConfig } from '../types'
import { AppIcon } from './AppIcon'
import { useAppStats } from '../hooks/useAppStats'
import { ArrowUpFromLine, Disc, AlertCircle, Loader2 } from 'lucide-react'
import { DEFAULT_ICON_CONFIG } from '../defaults'

interface RichAppTileProps {
    app: AppData
    onClick: () => void
    onContextMenu: (e: React.MouseEvent) => void
    isEditMode: boolean
    isAuthenticated: boolean
    iconConfig: IconConfig
}

export function RichAppTile({ app, onClick, onContextMenu, isEditMode, isAuthenticated, iconConfig }: RichAppTileProps) {
    const { stats, loading, error } = useAppStats(app, isAuthenticated)

    // --- Config Sanitization ---
    const config = { ...DEFAULT_ICON_CONFIG, ...iconConfig }

    const showBorder = !!config.showBorder
    const borderStyle = config.borderStyle || 'default'

    // --- Logic Groups ---
    // "Default" implies the branded Gradient Border (Cyan/Purple)
    const isGradient = showBorder && (borderStyle === 'gradient' || borderStyle === 'default')
    const isSolid = showBorder && borderStyle === 'solid'

    // Fallback applies if border is explicitly hidden (glass frame) OR if style is unknown
    const isFallback = !showBorder || (!isGradient && !isSolid)

    // OUTER: Handles Layout, Interaction, Gradient Borders (outside), Shadows
    const getOuterStyle = () => {
        const style: React.CSSProperties & { [key: string]: string } = {}

        // Gradient Border Variables
        if (isGradient) {
            style['--border-start'] = config.borderGradientColors?.[0] || '#00f3ff'
            style['--border-end'] = config.borderGradientColors?.[1] || '#9d00ff'
            style['--shadow-color'] = config.borderGradientColors?.[0] || '#00f3ff'
        }
        return style as React.CSSProperties
    }

    const getOuterClasses = () => {
        let classes = `relative w-full h-32 rounded-2xl transition-all duration-300 group `

        // Interaction / Animation
        if (isEditMode) {
            classes += 'animate-wiggle cursor-grab active:cursor-grabbing hover:scale-105 z-10 '
        } else {
            classes += 'hover:scale-105 active:scale-95 cursor-pointer hover:shadow-neon hover:shadow-lg '
        }

        // Gradient Border Class
        if (isGradient) {
            classes += "custom-border-gradient "
        }

        // Drop Shadow (for non-glass)
        if (config.backgroundStyle !== 'glass') {
            classes += "shadow-xl "
        }

        return classes
    }

    // INNER: Handles Backgrounds, Solid Borders, Content Clipping
    const getInnerStyle = () => {
        const style: React.CSSProperties & { [key: string]: string } = {}
        const opacity = config.backgroundOpacity !== undefined ? config.backgroundOpacity / 100 : 0.4

        // Sidebar Decoration (Gradient Composition)
        const sidebarGradient = 'linear-gradient(to right, rgba(255, 255, 255, 0.05) 40%, transparent 40%)'

        // Background Logic
        if (config.backgroundStyle === 'solid') {
            const hex = config.backgroundColor.replace('#', '')
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)
            if (!isNaN(r)) {
                style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
            } else {
                style.backgroundColor = config.backgroundColor
            }
            style.backgroundImage = sidebarGradient
            style.backdropFilter = 'none'

        } else if (config.backgroundStyle === 'gradient') {
            const userGradient = `linear-gradient(135deg, ${config.gradientColors[0]}, ${config.gradientColors[1]})`
            style.backgroundImage = `${sidebarGradient}, ${userGradient}`

        } else {
            // Glass or Default
            style.backgroundImage = sidebarGradient
        }

        // --- BORDER LOGIC ---
        // Explicitly set border properties

        // 1. Solid Border (User Configured)
        if (isSolid) {
            style['--border-color'] = config.borderColor
            style['--shadow-color'] = config.borderColor

            style.borderWidth = '1px'
            style.borderStyle = 'solid'
            style.borderColor = config.borderColor
        }
        // 2. Fallback Frame (e.g. Glass Panel Mode)
        // Matches if !showBorder. Using white/10 to match Standard Grid aesthetics.
        else if (isFallback) {
            style.borderWidth = '1px'
            style.borderStyle = 'solid'
            style.borderColor = 'rgba(255, 255, 255, 0.1)'
        }

        // Hardware Clip
        style.isolation = 'isolate'

        return style as React.CSSProperties
    }

    const getInnerClasses = () => {
        let classes = `absolute inset-0 rounded-2xl overflow-hidden flex ` // Flex for layout

        // Background Class (Glass)
        if (config.backgroundStyle === 'glass') {
            classes += "glass-panel "
        }

        // Solid Border Class
        if (isSolid) {
            classes += "custom-border-solid "
        }

        return classes
    }

    const renderStats = () => {
        if (loading) return <div className="flex items-center justify-center p-2"><Loader2 className="w-3 h-3 text-neon-cyan animate-spin" /></div>
        if (error) return <div className="text-[10px] text-red-400 p-2 truncate" title={error}>Connection Failed</div>

        if (app.integration === 'lidarr' && stats?.lidarr) {
            const { queue, albums } = stats.lidarr
            const isProtected = queue === -1

            if (isProtected) return <div className="text-[10px] text-gray-400 italic p-2">Protected</div>

            return (
                <div className="flex flex-col gap-2 p-2 w-full h-full justify-center">
                    <div className="flex items-center gap-2 text-white">
                        <ArrowUpFromLine className="w-4 h-4 text-orange-400 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none">{queue}</span>
                            <span className="text-[8px] text-gray-400 uppercase leading-none mt-0.5">Queue</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                        <Disc className="w-4 h-4 text-neon-purple shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none">{albums > 0 ? albums : '-'}</span>
                            <span className="text-[8px] text-gray-400 uppercase leading-none mt-0.5">Albums</span>
                        </div>
                    </div>
                </div>
            )
        }

        if (app.integration === 'ombi' && stats?.ombi) {
            const { movies, tv } = stats.ombi

            if (movies === 'protected') return <div className="text-[10px] text-gray-400 italic p-2">Protected</div>

            const moviePending = (typeof movies === 'object') ? movies.pending : 0
            const tvPending = (typeof tv === 'object') ? tv.pending : 0
            const totalPending = moviePending + tvPending

            if (totalPending === 0) return <div className="text-[10px] text-gray-500 p-2">No pending requests</div>

            return (
                <div className="flex flex-col gap-2 p-2 w-full h-full justify-center">
                    <div className="flex items-center gap-2 text-white">
                        <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none">{totalPending}</span>
                            <span className="text-[8px] text-gray-400 uppercase leading-none mt-0.5">Pending</span>
                        </div>
                    </div>
                </div>
            )
        }

        return <div className="text-[10px] text-gray-600 p-2 italic"></div>
    }

    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={getOuterClasses()}
            style={getOuterStyle()}
        >
            {/* Inner Content Wrapper */}
            <div className={getInnerClasses()} style={getInnerStyle()}>
                {/* Left: Logo (40%) */}
                <div className="w-[40%] h-full p-2 flex flex-col items-start justify-start relative">
                    <div className="w-full h-12 relative overflow-hidden rounded-lg">
                        <AppIcon
                            src={app.custom_icon_url || app.icon_url || app.default_icon || ''}
                            alt={app.name}
                            className="w-full h-full object-contain filter drop-shadow-md origin-top-left"
                        />
                    </div>
                </div>

                {/* Right: Stats (60%) */}
                <div className="w-[60%] h-full flex flex-col relative z-20">
                    <div className="flex-1 overflow-hidden relative">
                        {renderStats()}
                    </div>
                </div>

                {/* Bottom Name Overlay */}
                <div className={`absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent transition-opacity ${isEditMode ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="text-[10px] font-medium text-center text-white truncate px-1">
                        {app.name}
                    </div>
                </div>

                {/* Edit Mode Overlay */}
                {isEditMode && (
                    <div className="absolute inset-0 bg-black/20 z-30 flex items-center justify-center pointer-events-none"></div>
                )}
            </div>
        </div>
    )
}
