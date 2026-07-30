import React, { useState, useEffect, useCallback } from 'react'
import {
    MonitoringConfig,
    MonitoringEntity,
    OverlayWidthPercent,
    MonitoringCard,
} from '../../types/monitoring'
import { parseVarcoShareUrl } from '../../utils/varcoClient'
import { MonitoringContext } from './MonitoringContextDefinition'

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
            enabled: false,
        },
    ],
}

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
    const [pairingCode, setPairingCode] = useState<string | null>(null)

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
                const rawData = await res.json()
                if (rawData && Array.isArray(rawData.cards)) {
                    const normalizedCards = rawData.cards.map((c: Record<string, unknown>) => ({
                        ...c,
                        card_type: c.card_type || c.cardType || 'live_traffic',
                        cardType: c.cardType || c.card_type || 'live_traffic',
                        entity_ids: c.entity_ids || c.entityIds || [],
                        entityIds: c.entityIds || c.entity_ids || [],
                        zone_id: c.zone_id || c.zoneId || 'network',
                        zoneId: c.zoneId || c.zone_id || 'network',
                    }))
                    const parsedConfig: MonitoringConfig = {
                        ...rawData,
                        cards: normalizedCards,
                        demoMode: rawData.demoMode ?? rawData.demo_mode ?? true,
                        enabled: rawData.enabled ?? true,
                    }
                    setConfig(parsedConfig)
                    if (rawData.entities && Array.isArray(rawData.entities)) {
                        const entityMap: Record<string, MonitoringEntity> = {}
                        rawData.entities.forEach((ent: MonitoringEntity) => {
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
        const payload = {
            ...cfg,
            demo_mode: cfg.demoMode,
            demoMode: cfg.demoMode,
        }
        setConfig(payload)
        try {
            await fetch('/api/v1/monitoring/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
        const newDemo = !(config.demoMode ?? true)
        const updated = { ...config, demoMode: newDemo }
        saveConfig(updated)
    }, [config, saveConfig])

    const toggleVarcoIntegration = useCallback(() => {
        if (!config) return
        const providers = [...(config.providers || [])]
        const idx = providers.findIndex((p) => p.type === 'varco')
        if (idx >= 0) {
            providers[idx] = { ...providers[idx], enabled: !providers[idx].enabled }
        } else {
            providers.push({
                id: 'varco-main-provider',
                name: 'Varco Bridge',
                type: 'varco',
                enabled: true,
            })
        }
        saveConfig({ ...config, providers })
    }, [config, saveConfig])

    const updatePollingInterval = useCallback((seconds: number) => {
        if (!config) return
        const interval = Math.max(5, Math.min(600, seconds))
        const updated = {
            ...config,
            polling_interval_seconds: interval,
            pollingIntervalSeconds: interval,
        }
        saveConfig(updated)
    }, [config, saveConfig])

    const updateCardZone = useCallback(
        (cardId: string, zoneId: string) => {
            if (!config) return
            const updated: MonitoringConfig = {
                ...config,
                cards: config.cards.map((c) => (c.id === cardId ? { ...c, zone_id: zoneId, zoneId: zoneId } : c)),
            }
            saveConfig(updated)
        },
        [config, saveConfig]
    )

    const moveCardOrder = useCallback(
        (cardId: string, direction: 'up' | 'down') => {
            if (!config) return
            const idx = config.cards.findIndex((c) => c.id === cardId)
            if (idx === -1) return
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1
            if (targetIdx < 0 || targetIdx >= config.cards.length) return

            const newCards = [...config.cards]
            const [movedCard] = newCards.splice(idx, 1)
            newCards.splice(targetIdx, 0, movedCard)

            const updated: MonitoringConfig = { ...config, cards: newCards }
            saveConfig(updated)
        },
        [config, saveConfig]
    )

    const toggleZoneVisibility = useCallback(
        (zoneId: string) => {
            if (!config) return
            const updated: MonitoringConfig = {
                ...config,
                zones: config.zones.map((z) => (z.id === zoneId ? { ...z, hidden: !z.hidden } : z)),
            }
            saveConfig(updated)
        },
        [config, saveConfig]
    )

    const toggleCardVisibility = useCallback(
        (cardId: string) => {
            if (!config) return
            const updated: MonitoringConfig = {
                ...config,
                cards: config.cards.map((c) => (c.id === cardId ? { ...c, hidden: !c.hidden } : c)),
            }
            saveConfig(updated)
        },
        [config, saveConfig]
    )

    const resetMonitoringConfig = useCallback(async () => {
        try {
            Object.keys(localStorage).forEach((key) => {
                if (key.includes('varco.')) {
                    localStorage.removeItem(key)
                }
            })
        } catch {
            // ignore
        }

        try {
            await fetch('/api/v1/monitoring/reset', { method: 'DELETE' })
        } catch (e) {
            console.error('Failed to reset monitoring config', e)
        }

        setPairingCode(null)
        setEntities({})
        await refreshConfig()
    }, [refreshConfig])

    useEffect(() => {
        refreshConfig()
    }, [refreshConfig])

    // Live Varco Bridge Client Integration (Connects directly using Varco Client SDK)
    useEffect(() => {
        if (config?.enabled === false) return

        const varcoProvider = config?.providers.find((p) => p.type === 'varco' && p.enabled)
        if (!varcoProvider || !varcoProvider.url) return

        const params = parseVarcoShareUrl(varcoProvider.url, varcoProvider.settings)
        if (!params) return

        let isMounted = true

        const connectVarcoBridge = async () => {
            try {
                const scriptUrl = `/api/v1/monitoring/varco-client.js?bridge_url=${encodeURIComponent(params.bridgeUrl)}`

                const win = window as unknown as Record<string, unknown>
                let createVarcoClient = win.createVarcoClient || win.createVarcoConsumerClient

                if (!createVarcoClient) {
                    try {
                        const varcoModule = await import(/* @vite-ignore */ scriptUrl)
                        createVarcoClient = varcoModule.createVarcoClient || varcoModule.createVarcoConsumerClient || varcoModule.default
                        if (createVarcoClient) {
                            win.createVarcoClient = createVarcoClient
                        }
                    } catch (err) {
                        console.warn('Failed to dynamically import varco-client ES module:', err)
                    }
                }

                if (!createVarcoClient || !isMounted) return

                const prefix = `varco.shareIdentity.v1.${params.authorityId}.${params.shareCode}.`

                // Restore backend shared consumer key into browser storage if present
                const backendKey = varcoProvider.settings?.privateKey || (varcoProvider as unknown as { privateKey?: string }).privateKey
                if (backendKey && typeof backendKey === 'string') {
                    const existingIdentity = localStorage.getItem(prefix + 'varco.consumerIdentity.v1')
                    if (!existingIdentity) {
                        localStorage.setItem(prefix + 'varco.consumerIdentity.v1', JSON.stringify({ privateKey: backendKey }))
                    }
                }

                const storage = {
                    getItem: (key: string) => localStorage.getItem(prefix + key),
                    setItem: (key: string, value: string) => {
                        localStorage.setItem(prefix + key, value)
                        if (key === 'varco.consumerIdentity.v1') {
                            try {
                                const parsed = JSON.parse(value)
                                if (parsed?.privateKey && config) {
                                    const providerId = varcoProvider.id
                                    const updatedProviders = config.providers.map((p) => {
                                        if (p.id === providerId) {
                                            return { ...p, settings: { ...p.settings, privateKey: parsed.privateKey } }
                                        }
                                        return p
                                    })
                                    saveConfig({ ...config, providers: updatedProviders })
                                }
                            } catch {}
                        }
                    },
                    removeItem: (key: string) => localStorage.removeItem(prefix + key),
                }

                const cardEntityIds = (config?.cards || []).flatMap((c) => c.entity_ids || c.entityIds || [])
                const requestedEntities = Array.from(
                    new Set([
                        'sensor.speedtest_download',
                        'sensor.speedtest_upload',
                        'sensor.speedtest_ping',
                        ...(config?.entities || []).map((e) => e.id),
                        ...cardEntityIds,
                    ])
                )

                const client = createVarcoClient({
                    authorityId: params.authorityId,
                    bridgeUrl: params.bridgeUrl,
                    storage,
                    manifest: {
                        name: 'ER-Startseite Dashboard',
                        version: '0.1.0',
                        read_entities: requestedEntities,
                        subscriptions: requestedEntities,
                    },
                })

                if (params.claimSecret && typeof client.claimShare === 'function') {
                    await client.claimShare(params.shareCode, params.claimSecret).catch(() => {})
                }

                try {
                    await client.connect()
                } catch (connectErr: unknown) {
                    const errObj = connectErr as { message?: string }
                    const errMsg = errObj?.message || String(connectErr)
                    if (errMsg.includes('No active grant') || errMsg.includes('Grant revoked') || errMsg.includes('Grant denied')) {
                        if (typeof client.requestAccess === 'function') {
                            const manifestPayload = {
                                name: 'ER-Startseite Dashboard',
                                version: '0.1.0',
                                read_entities: requestedEntities,
                                subscriptions: requestedEntities,
                            }
                            const access = await client.requestAccess(manifestPayload).catch(() => null)
                            const pCode = access?.pairing_code || access?.pairingCode || access?.code || access?.pin
                            if (pCode) {
                                setPairingCode(String(pCode))
                            }
                            try {
                                await client.connect()
                            } catch (retryErr) {
                                console.debug('Varco Bridge connect post-requestAccess:', retryErr)
                            }
                        }
                    } else {
                        console.debug('Varco Bridge connection info:', errMsg)
                    }
                }
                if (!isMounted) return
                setIsSystemOnline(true)

                const grant = await client.getGrantInfo()
                const entityIds = Array.from(
                    new Set([
                        ...(grant?.manifest?.read_entities || []),
                        ...(grant?.manifest?.subscriptions || []),
                        ...cardEntityIds,
                        'sensor.speedtest_download',
                        'sensor.speedtest_upload',
                        'sensor.speedtest_ping',
                    ])
                )

                const liveStates = await client.getStates(entityIds).catch(() => null)
                if (isMounted && liveStates && typeof liveStates === 'object') {
                    const updatedEntities: Record<string, MonitoringEntity> = {}
                    Object.entries(liveStates).forEach(([eid, entData]: [string, unknown]) => {
                        if (entData) {
                            const val = typeof entData === 'object' ? entData.state : entData
                            const unit = typeof entData === 'object' ? entData.attributes?.unit_of_measurement : undefined
                            const name = (typeof entData === 'object' && entData.attributes?.friendly_name) || eid.split('.').pop()?.replace(/_/g, ' ') || eid
                            updatedEntities[eid] = {
                                id: eid,
                                provider_id: 'varco-live',
                                name: name,
                                domain: eid.startsWith('binary_sensor.') ? 'binary_sensor' : 'sensor',
                                value_type: typeof val === 'number' ? 'numeric' : 'string',
                                state: val ?? 'N/A',
                                unit_of_measurement: unit,
                                last_updated: new Date().toISOString(),
                            }
                        }
                    })
                    if (Object.keys(updatedEntities).length > 0) {
                        setEntities((prev) => ({ ...prev, ...updatedEntities }))
                        setPairingCode(null)
                        fetch('/api/v1/monitoring/telemetry', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ entities: Object.values(updatedEntities) }),
                        }).catch(() => {})
                    }
                }

                if (typeof client.subscribeEntities === 'function') {
                    await client.subscribeEntities(entityIds, (event: { states?: Record<string, unknown> }) => {
                        if (!isMounted || !event?.states) return
                        const streamEntities: Record<string, MonitoringEntity> = {}
                        Object.entries(event.states).forEach(([eid, entData]: [string, unknown]) => {
                            if (entData) {
                                const val = typeof entData === 'object' ? entData.state : entData
                                const unit = typeof entData === 'object' ? entData.attributes?.unit_of_measurement : undefined
                                const name = (typeof entData === 'object' && entData.attributes?.friendly_name) || eid.split('.').pop()?.replace(/_/g, ' ') || eid
                                streamEntities[eid] = {
                                    id: eid,
                                    provider_id: 'varco-live',
                                    name: name,
                                    domain: eid.startsWith('binary_sensor.') ? 'binary_sensor' : 'sensor',
                                    value_type: typeof val === 'number' ? 'numeric' : 'string',
                                    state: val ?? 'N/A',
                                    unit_of_measurement: unit,
                                    last_updated: new Date().toISOString(),
                                }
                            }
                        })
                        if (Object.keys(streamEntities).length > 0) {
                            setEntities((prev) => ({ ...prev, ...streamEntities }))
                            setPairingCode(null)
                            fetch('/api/v1/monitoring/telemetry', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ entities: Object.values(streamEntities) }),
                            }).catch(() => {})
                        }
                    })
                }
            } catch (e: unknown) {
                const errObj = e as { message?: string }
                console.debug('Varco Bridge connection status:', errObj?.message || e)
                fetch('/api/v1/monitoring/telemetry')
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.entities && Array.isArray(data.entities)) {
                            const telEntities: Record<string, MonitoringEntity> = {}
                            data.entities.forEach((ent: MonitoringEntity) => {
                                if (ent.id) telEntities[ent.id] = ent
                            })
                            setEntities((prev) => ({ ...prev, ...telEntities }))
                            setIsSystemOnline(data.online ?? true)
                        }
                    })
                    .catch(() => {})
            }
        }

        connectVarcoBridge()

        return () => {
            isMounted = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.enabled, config?.providers])

    // Periodic Telemetry & System Health Check (Runs immediately upon mount & polls every 3s when overlay is open)
    useEffect(() => {
        let failCount = 0
        const fetchTelemetry = async () => {
            if (config?.enabled === false) return
            try {
                const res = await fetch('/api/v1/monitoring/telemetry')
                if (res.ok) {
                    failCount = 0
                    const data = await res.json()
                    setIsSystemOnline(data.online ?? true)
                    if (data.entities && Array.isArray(data.entities)) {
                        setEntities((prev) => {
                            const next = { ...prev }
                            data.entities.forEach((ent: MonitoringEntity) => {
                                // Sync entity states from backend telemetry relay across all browser sessions
                                const current = next[ent.id]
                                if (!current || current.last_updated === undefined || (ent.last_updated && new Date(ent.last_updated).getTime() >= new Date(current.last_updated).getTime())) {
                                    next[ent.id] = ent
                                }
                            })
                            return next
                        })
                    }
                } else {
                    failCount++
                    if (failCount >= 2) setIsSystemOnline(false)
                }
            } catch {
                failCount++
                if (failCount >= 2) setIsSystemOnline(false)
            }
        }

        fetchTelemetry()
        if (!isOpen) return

        const interval = setInterval(fetchTelemetry, 3000)
        return () => clearInterval(interval)
    }, [config?.enabled, isOpen])

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
                pairingCode,
                clearPairingCode: () => setPairingCode(null),
                toggleEnabled,
                toggleDemoMode,
                toggleVarcoIntegration,
                updatePollingInterval,
                refreshConfig,
                saveConfig,
                deleteCard,
                addCard,
                updateCardZone,
                moveCardOrder,
                toggleZoneVisibility,
                toggleCardVisibility,
                resetMonitoringConfig,
            }}
        >
            {children}
        </MonitoringContext.Provider>
    )
}


