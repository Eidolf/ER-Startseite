import { AppData } from '../types'

export type RegistryLayout = 'grid-4' | 'rows-2' | 'mixed' | 'logo-only'

export interface StatItem {
    label: string
    value: string | number
    icon?: string // Lucide icon name, handled by a mapping or generic Icon component
    unit?: string
    color?: string // Optional color override (e.g. 'text-orange-400')
}

export interface FetchContext {
    app: AppData
    isAuthenticated: boolean
    fetch: typeof fetch // Injected fetch (could be proxyFetch)
}

export type FetchStatsResult = Record<string, StatItem | 'protected' | null>

export interface PremiumAppManifest {
    id: string
    name: string
    description?: string
    layout: RegistryLayout
    /**
     * Map the generic stat keys (e.g. 'top-left', 'bottom') to specific data.
     * The keys depend on the layout:
     * - grid-4: 'tl', 'tr', 'bl', 'br'
     * - rows-2: 'top', 'bottom'
     * - mixed: 'top-left', 'top-right', 'bottom' (or whatever logic we define)
     */
    fetchStats: (context: FetchContext) => Promise<FetchStatsResult>

    /**
     * List of features that can be configured/toggled in the UI for this app.
     * e.g. ['queue', 'stats', 'movies', 'tv']
     * If undefined or empty, no API configuration UI (beyond URL/Key) will be shown, 
     * or maybe even URL/Key should be hidden if this is explicit?
     * User wants: "API Felder auch nur bei den Apps angezeigt werden die wir mit API Feldern ausstatten."
     */
    configurableFeatures?: string[]
}
