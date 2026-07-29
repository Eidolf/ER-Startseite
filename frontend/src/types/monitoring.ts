export interface MonitoringEntity {
    id: string
    provider_id: string
    name: string
    domain: 'sensor' | 'binary_sensor' | 'network' | 'server' | 'container' | 'custom'
    value_type: 'numeric' | 'string' | 'boolean'
    state: number | string | boolean
    unit_of_measurement?: string
    icon?: string
    last_updated?: string
    attributes?: Record<string, unknown>
}

export type CardType = 'gauge' | 'live_traffic' | 'status_beacon' | 'metric_card'

export interface MonitoringCard {
    id: string
    title: string
    card_type: CardType
    entity_ids: string[]
    zone_id: string
    x?: number
    y?: number
    w?: number
    h?: number
    settings?: Record<string, unknown>
}

export interface MonitoringZone {
    id: string
    name: string
    icon?: string
}

export interface MonitoringProviderConfig {
    id: string
    name: string
    type: 'varco' | 'homeassistant' | 'prometheus' | 'uptime_kuma' | 'docker' | 'custom'
    enabled: boolean
    url?: string
    api_key?: string
    settings?: Record<string, unknown>
}

export interface MonitoringConfig {
    version: string
    zones: MonitoringZone[]
    cards: MonitoringCard[]
    providers: MonitoringProviderConfig[]
}

export type OverlayWidthPercent = 25 | 50 | 75 | 100
