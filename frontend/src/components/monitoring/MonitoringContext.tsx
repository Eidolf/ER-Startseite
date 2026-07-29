import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    MonitoringConfig,
    MonitoringEntity,
    OverlayWidthPercent,
    MonitoringCard,
} from '../../types/monitoring'

interface MonitoringContextType {
    isOpen: boolean
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
    widthPercent: OverlayWidthPercent
    setWidthPercent: (w: OverlayWidthPercent) => void
    activeZoneId: string
    setActiveZoneId: (zone: string) => void
    config: MonitoringConfig | null
    entities: Record<string, MonitoringEntity>
    isSystemOnline: boolean
    isEditMode: boolean
    setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>
    toggleEnabled: () => void
    toggleDemoMode: () => void
    refreshConfig: () => Promise<void>
    saveConfig: (cfg: MonitoringConfig) => Promise<void>
    deleteCard: (cardId: string) => void
    addCard: (card: MonitoringCard) => void
}

const STORAGE_WIDTH_KEY = 'er_monitoring_width'

const DEFAULT_CONFIG: MonitoringConfig = {
    version: '1.0.0',
    enabled: true,
    demoMode: true,
    zones: [
        { id: 'overview', name: 'Overview', icon: 'Activity' },
        { id: 'network', name: 'Network Operations', icon: 'Wifi' },
        { id: 'infrastructure', name: 'Infrastructure', icon: 'Server' },
        { id: 'smarthome', name: 'Smart Home', icon: 'Home' },
        { id: 'security', name: 'Security', icon: 'Shield' },
        { id: 'custom', name: 'Custom', icon: 'Sliders' },
    ],
    cards: [
        {
            id: 'card-download',
            title: 'Download Speed',
            card_type: 'live_traffic',
            entity_ids: ['sensor.speedtest_download'],
            zone_id: 'network',
        },
        {
            id: 'card-upload',
            title: 'Upload Speed',
            card_type: 'live_traffic',
            entity_ids: ['sensor.speedtest_upload'],
            zone_id: 'network',
        },
        {
            id: 'card-ping',
            title: 'Network Latency (Ping)',
            card_type: 'gauge',
            entity_ids: ['sensor.speedtest_ping'],
            zone_id: 'network',
        },
    ],
    providers: [
        {
            id: 'provider-varco-default',
            name: 'Varco Home Assistant',
            type: 'varco',
            enabled: true,
        },
    ],
}

const MonitoringContext = createContext<MonitoringContextType | null>(null)

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [widthState, setWidthState] = useState<OverlayWidthPercent>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_WIDTH_KEY)
            if (saved) {
                const parsed = parseInt(saved, 10)
                if ([25, 50, 75, 100].includes(parsed)) {
                    return parsed as OverlayWidthPercent
                }
            }
        } catch {
            // fallback
        }
        return 50
    })
    const widthPercent = widthState

    const [activeZoneId, setActiveZoneId] = useState<string>('network')
    const [config, setConfig] = useState<MonitoringConfig | null>(DEFAULT_CONFIG)
    const [isEditMode, setIsEditMode] = useState<boolean>(false)
    const [isSystemOnline, setIsSystemOnline] = useState<boolean>(true)

    // Entity Live Simulation State
    const [entities, setEntities] = useState<Record<string, MonitoringEntity>>({
        'sensor.speedtest_download': {
            id: 'sensor.speedtest_download',
            provider_id: 'varco-default',
            name: 'Download Speed',
            domain: 'sensor',
            value_type: 'numeric',
            state: 'N/A',
            unit_of_measurement: 'Mbit/s',
            last_updated: new Date().toISOString(),
        },
        'sensor.speedtest_upload': {
            id: 'sensor.speedtest_upload',
            provider_id: 'varco-default',
            name: 'Upload Speed',
            domain: 'sensor',
            value_type: 'numeric',
            state: 'N/A',
            unit_of_measurement: 'Mbit/s',
            last_updated: new Date().toISOString(),
        },
        'sensor.speedtest_ping': {
            id: 'sensor.speedtest_ping',
            provider_id: 'varco-default',
            name: 'Ping Latency',
            domain: 'sensor',
            value_type: 'numeric',
            state: 'N/A',
            unit_of_measurement: 'ms',
            last_updated: new Date().toISOString(),
        },
    })

    const setWidthPercent = (w: OverlayWidthPercent) => {
        setWidthState(w)
        try {
            localStorage.setItem(STORAGE_WIDTH_KEY, String(w))
        } catch {
            // ignore
        }
    }

    const refreshConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/monitoring/config')
            if (res.ok) {
                const data: MonitoringConfig = await res.json()
                if (data && Array.isArray(data.cards)) {
                    setConfig(data)
                    if (data.entities && Array.isArray(data.entities)) {
                        const entityMap: Record<string, MonitoringEntity> = {}
                        data.entities.forEach((ent) => {
                            entityMap[ent.id] = ent
                        })
                        setEntities((prev) => ({ ...prev, ...entityMap }))
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch monitoring config', e)
        }
    }, [])

    const saveConfig = useCallback(async (cfg: MonitoringConfig) => {
        setConfig(cfg)
        try {
            await fetch('/api/v1/monitoring/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg),
            })
        } catch (e) {
            console.error('Failed to save monitoring config', e)
        }
    }, [])

    const deleteCard = useCallback(
        (cardId: string) => {
            if (!config) return
            const updated: MonitoringConfig = {
                ...config,
                cards: config.cards.filter((c) => c.id !== cardId),
            }
            saveConfig(updated)
        },
        [config, saveConfig]
    )

    const addCard = useCallback(
        (card: MonitoringCard) => {
            if (!config) return
            const updated: MonitoringConfig = {
                ...config,
                cards: [...config.cards, card],
            }
            saveConfig(updated)
        },
        [config, saveConfig]
    )

    const toggleEnabled = useCallback(() => {
        if (!config) return
        const updated = { ...config, enabled: !config.enabled }
        saveConfig(updated)
    }, [config, saveConfig])

    const toggleDemoMode = useCallback(() => {
        if (!config) return
        const updated = { ...config, demoMode: !config.demoMode }
        saveConfig(updated)
    }, [config, saveConfig])

    useEffect(() => {
        refreshConfig()
    }, [refreshConfig])

    // Periodic Telemetry & System Health Check (Polls every 15s)
    useEffect(() => {
        const fetchTelemetry = async () => {
            if (config?.enabled === false) return
            try {
                const res = await fetch('/api/v1/monitoring/telemetry')
                if (res.ok) {
                    const data = await res.json()
                    setIsSystemOnline(data.online ?? true)
                    if (data.entities && Array.isArray(data.entities)) {
                        const entMap: Record<string, MonitoringEntity> = {}
                        data.entities.forEach((ent: MonitoringEntity) => {
                            entMap[ent.id] = ent
                        })
                        setEntities((prev) => ({ ...prev, ...entMap }))
                    }
                }
            } catch {
                setIsSystemOnline(false)
            }
        }

        fetchTelemetry()
        const interval = setInterval(fetchTelemetry, 15000)
        return () => clearInterval(interval)
    }, [config?.enabled])

    // Live Telemetry Interpolation / Jitter Simulator (Only when Demo Mode is ON)
    useEffect(() => {
        if (config?.demoMode === false) return

        const interval = setInterval(() => {
            setEntities((prev) => {
                const next = { ...prev }

                if (next['sensor.speedtest_download']) {
                    const jitter = (Math.random() - 0.5) * 8
                    const newSpeed = Math.max(100, Math.min(1000, Number(next['sensor.speedtest_download'].state) + jitter))
                    next['sensor.speedtest_download'] = {
                        ...next['sensor.speedtest_download'],
                        state: parseFloat(newSpeed.toFixed(1)),
                        last_updated: new Date().toISOString(),
                    }
                }

                if (next['sensor.speedtest_upload']) {
                    const jitter = (Math.random() - 0.5) * 2
                    const newUp = Math.max(10, Math.min(200, Number(next['sensor.speedtest_upload'].state) + jitter))
                    next['sensor.speedtest_upload'] = {
                        ...next['sensor.speedtest_upload'],
                        state: parseFloat(newUp.toFixed(1)),
                        last_updated: new Date().toISOString(),
                    }
                }

                if (next['sensor.speedtest_ping']) {
                    const jitter = (Math.random() - 0.5) * 1.5
                    const newPing = Math.max(4, Math.min(120, Number(next['sensor.speedtest_ping'].state) + jitter))
                    next['sensor.speedtest_ping'] = {
                        ...next['sensor.speedtest_ping'],
                        state: parseFloat(newPing.toFixed(1)),
                        last_updated: new Date().toISOString(),
                    }
                }

                return next
            })
        }, 2000)

        return () => clearInterval(interval)
    }, [config?.demoMode])

    return (
        <MonitoringContext.Provider
            value={{
                isOpen,
                setIsOpen,
                widthPercent,
                setWidthPercent,
                activeZoneId,
                setActiveZoneId,
                config,
                entities,
                isSystemOnline,
                isEditMode,
                setIsEditMode,
                toggleEnabled,
                toggleDemoMode,
                refreshConfig,
                saveConfig,
                deleteCard,
                addCard,
            }}
        >
            {children}
        </MonitoringContext.Provider>
    )
}

export const useMonitoring = () => {
    const ctx = useContext(MonitoringContext)
    if (!ctx) {
        throw new Error('useMonitoring must be used within a MonitoringProvider')
    }
    return ctx
}
