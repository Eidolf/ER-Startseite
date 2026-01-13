import { AppData, IconConfig } from '../types'
import { AppRegistry } from '../registries'
import { StatItem } from '../registries/types'
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
        if (!stats) return <div className="text-[10px] text-gray-600 p-2 italic"></div>

        // Get Manifest to know layout
        // We need lookup, or pass it from useAppStats? 
        // Ideally AppData has enough info, or we import registry.
        // Let's import registry here too.

        // Dynamic import to avoid cycles? No, registry import is fine.
        // We need to know which App this is. app.integration

        // If 'protected', showing generic protected message? 
        // The stats object values can be 'protected'.

        // Helper to render a single stat item
        const renderItem = (item: StatItem | 'protected') => {
            if (item === 'protected') return <div className="text-[10px] text-gray-400 italic">Protected</div>
            if (!item) return null

            // Icon lookup could be generic, for now we map known ones or just pass component names if we had them.
            // We passed 'ArrowUpFromLine' string.
            const IconMap: Record<string, React.ElementType> = {
                'ArrowUpFromLine': ArrowUpFromLine,
                'Disc': Disc,
                'AlertCircle': AlertCircle,
                'Loader2': Loader2
            }
            const IconComp = (item.icon && IconMap[item.icon]) || Disc

            return (
                <div className="flex items-center gap-2 text-white">
                    <IconComp className={`w-4 h-4 shrink-0 ${item.color || 'text-neon-cyan'}`} />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold leading-none">{item.value}</span>
                        <span className="text-[8px] text-gray-400 uppercase leading-none mt-0.5">{item.label}</span>
                    </div>
                </div>
            )
        }

        // Layouts
        // We have 'top', 'bottom', 'tl', 'tr', 'bl', 'br' in stats based on manifest.

        // Mixed / Rows-2 (Visually similar: Vertical stack)
        return (
            <div className="flex flex-col gap-2 p-2 w-full h-full justify-center">
                {stats['top'] && renderItem(stats['top'])}
                {stats['bottom'] && renderItem(stats['bottom'])}
                {stats['tl'] && renderItem(stats['tl'])}
                {stats['tr'] && renderItem(stats['tr'])}
                {stats['bl'] && renderItem(stats['bl'])}
                {stats['br'] && renderItem(stats['br'])}
            </div>
        )
    }

    // Layout Checks
    const isLogoOnly = !app.integration || (AppRegistry[app.integration]?.layout === 'logo-only')

    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={getOuterClasses()}
            style={getOuterStyle()}
        >
            {/* Inner Content Wrapper */}
            <div className={getInnerClasses()} style={getInnerStyle()}>
                {/* Left: Logo (40% or 100%) */}
                <div className={`h-full flex flex-col items-center justify-center relative transition-all duration-300 ${isLogoOnly ? 'w-full p-6' : 'w-[40%] p-2 items-start justify-start'}`}>
                    <div className={`relative overflow-hidden rounded-lg ${isLogoOnly ? 'w-20 h-20' : 'w-full h-12'}`}>
                        <AppIcon
                            src={app.custom_icon_url || app.icon_url || app.default_icon || ''}
                            alt={app.name}
                            className={`w-full h-full object-contain filter drop-shadow-md ${isLogoOnly ? 'origin-center' : 'origin-top-left'}`}
                        />
                    </div>
                </div>

                {/* Right: Stats (60% or Hidden) */}
                {!isLogoOnly && (
                    <div className="w-[60%] h-full flex flex-col relative z-20">
                        <div className="flex-1 overflow-hidden relative">
                            {renderStats()}
                        </div>
                    </div>
                )}

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
