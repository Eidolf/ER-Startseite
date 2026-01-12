export interface BackgroundConfig {
    type: 'image' | 'video'
    value: string // URL or 'gradient'
}

export interface LogoConfig {
    type: 'default' | 'image'
    value?: string
}

export interface IconConfig {
    showBorder: boolean
    borderStyle: 'default' | 'solid' | 'gradient'
    borderColor: string
    borderGradientColors: [string, string]
    backgroundStyle: 'glass' | 'solid' | 'gradient'
    backgroundColor: string
    gradientColors: [string, string]
    backgroundOpacity: number // 0-100
}

export interface TitleConfig {
    style: 'default' | 'solid' | 'gradient'
    color?: string
    gradientColors?: [string, string]
}

export interface Category {
    id: string
    name: string
    app_ids: string[]
}

export type LayoutMode = 'grid' | 'list' | 'compact' | 'categories'

export interface LayoutConfig {
    mode: LayoutMode
    customOrder: string[] // App IDs
    widgets: WidgetData[]
    categories: Category[]
    hiddenAppIds: string[]
}

export interface WidgetData {
    id: string
    type: 'weather' | 'clock' | 'search' | 'calendar' | 'text'
    x?: number // For grid positioning if we were using RGL, but here maybe just order?
    y?: number
    w?: number
    h?: number
    settings?: Record<string, any>
}

export interface AppConfig {
    pageTitle: string
    openInNewTab: boolean
    bgConfig: BackgroundConfig
    logoConfig: LogoConfig
    iconConfig: IconConfig
    layoutConfig: LayoutConfig
}

export interface PremiumAppConfig {
    movies?: { enabled: boolean, protected?: boolean }
    tv?: { enabled: boolean, protected?: boolean }
    stats?: { enabled: boolean, protected?: boolean } // Generic stats (e.g. Lidarr Library)
    queue?: { enabled: boolean; protected: boolean };
    calendar?: { enabled: boolean, protected?: boolean } // Generic calendar (e.g. Lidarr Upcoming)
    [key: string]: unknown
}

export interface AppData {
    id: string
    name: string
    url?: string
    icon_url?: string
    custom_icon_url?: string
    description?: string
    default_icon?: string // For premium apps
    type?: 'link' | 'folder'
    contents?: AppData[]
    integration?: string
    api_key?: string
    api_url?: string
    api_protected?: boolean
    api_config?: PremiumAppConfig
}
