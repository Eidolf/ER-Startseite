export interface MonitoringEntity {
    id: string
    provider_id?: string
    providerId?: string
    name: string
    domain: 'sensor' | 'binary_sensor' | 'network' | 'server' | 'container' | 'custom' | string
    value_type?: 'numeric' | 'string' | 'boolean' | string
    valueType?: string
    state: number | string | boolean
    unit_of_measurement?: string
    unitOfMeasurement?: string
    icon?: string
    last_updated?: string
    lastUpdated?: string
    attributes?: Record<string, unknown>
}

export type CardType = 'gauge' | 'live_traffic' | 'status_beacon' | 'metric_card'

export interface MonitoringCard {
    id: string
    title: string
    card_type?: CardType
    cardType?: CardType
    entity_ids?: string[]
    entityIds?: string[]
    zone_id?: string
    zoneId?: string
    x?: number
    y?: number
    w?: number
    h?: number
    hidden?: boolean
    settings?: Record<string, unknown>
}

export interface MonitoringZone {
    id: string
    name: string
    icon?: string
    hidden?: boolean
}

export const SYSTEM_ZONE_IDS = ['overview', 'network', 'infrastructure', 'smarthome', 'security']

export interface MonitoringProviderConfig {
    id: string
    name: string
    type: 'varco' | 'homeassistant' | 'prometheus' | 'uptime_kuma' | 'docker' | 'custom'
    enabled: boolean
    url?: string
    api_key?: string
    apiKey?: string
    polling_interval_seconds?: number
    pollingIntervalSeconds?: number
    settings?: Record<string, unknown>
}

export interface MonitoringConfig {
    version: string
    enabled: boolean
    demoMode: boolean
    demo_mode?: boolean
    polling_interval_seconds?: number
    pollingIntervalSeconds?: number
    zones: MonitoringZone[]
    cards: MonitoringCard[]
    entities?: MonitoringEntity[]
    providers: MonitoringProviderConfig[]
}

export type OverlayWidthPercent = 25 | 50 | 75 | 100
