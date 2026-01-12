import { BackgroundConfig, LogoConfig, TitleConfig, IconConfig, LayoutConfig } from './types'

export const DEFAULT_BG: BackgroundConfig = {
    type: 'image',
    value: 'gradient'
}

export const DEFAULT_LOGO_CONFIG: LogoConfig = {
    type: 'default',
    value: undefined
}

export const DEFAULT_TITLE_CONFIG: TitleConfig = {
    style: 'default',
    color: '#ffffff',
    gradientColors: ['#00f3ff', '#9d00ff']
}

export const DEFAULT_ICON_CONFIG: IconConfig = {
    showBorder: true,
    borderStyle: 'default',
    borderColor: '#00f3ff', // neon-cyan
    borderGradientColors: ['#00f3ff', '#9d00ff'], // Cyan -> Purple
    backgroundStyle: 'glass',
    backgroundColor: '#000000',
    gradientColors: ['#1a1a1a', '#000000'],
    backgroundOpacity: 10 // Default glass opacity (low)
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    mode: 'grid',
    customOrder: [],
    widgets: [],
    categories: [],
    hiddenAppIds: []
}
