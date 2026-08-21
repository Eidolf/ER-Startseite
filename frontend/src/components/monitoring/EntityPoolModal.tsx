import React, { useState, useMemo } from 'react'
import { X, Plus, Check, Search, Box, Activity, Wifi, Server, Shield } from 'lucide-react'
import { useMonitoring } from './useMonitoring'
import { CardType, MonitoringCard } from '../../types/monitoring'

interface EntityPoolModalProps {
    isOpen: boolean
    onClose: () => void
}

export const EntityPoolModal: React.FC<EntityPoolModalProps> = ({ isOpen, onClose }) => {
    const { config, entities, activeZoneId, addCard, saveConfig } = useMonitoring()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDomain, setSelectedDomain] = useState<string>('all')
    const [targetZone, setTargetZone] = useState<string>(activeZoneId || 'network')
    const [cardTypeMap, setCardTypeMap] = useState<Record<string, CardType>>({})

    const allEntities = useMemo(() => {
        const list = config?.entities || []
        // Also combine with live entities map if some exist only in memory
        const knownMap = new Map<string, typeof list[0]>()
        list.forEach((e) => knownMap.set(e.id, e))
        Object.entries(entities).forEach(([id, liveEnt]) => {
            if (!knownMap.has(id)) {
                knownMap.set(id, liveEnt)
            }
        })
        return Array.from(knownMap.values())
    }, [config?.entities, entities])

    const cardsByEntityId = useMemo(() => {
        const map = new Map<string, MonitoringCard[]>()
        ;(config?.cards || []).forEach((c) => {
            const eIds = c.entity_ids || c.entityIds || []
            eIds.forEach((eid) => {
                const existing = map.get(eid) || []
                existing.push(c)
                map.set(eid, existing)
            })
        })
        return map
    }, [config?.cards])

    const filteredEntities = useMemo(() => {
        return allEntities.filter((e) => {
            const matchesSearch =
                e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesDomain = selectedDomain === 'all' || e.domain === selectedDomain
            return matchesSearch && matchesDomain
        })
    }, [allEntities, searchQuery, selectedDomain])

    if (!isOpen) return null

    const getDefaultCardType = (eid: string): CardType => {
        const lower = eid.toLowerCase()
        if (lower.includes('download') || lower.includes('upload') || lower.includes('traffic') || lower.includes('speed')) {
            return 'live_traffic'
        }
        if (lower.includes('ping') || lower.includes('latency') || lower.includes('temp') || lower.includes('cpu') || lower.includes('usage') || lower.includes('memory')) {
            return 'sparkline_card'
        }
        if (eid.startsWith('binary_sensor.') || lower.includes('status') || lower.includes('online')) {
            return 'status_beacon'
        }
        return 'metric_card'
    }

    const handleAddEntityCard = (eid: string, name: string) => {
        const chosenType = cardTypeMap[eid] || getDefaultCardType(eid)
        const newCardId = `card-${eid.replace(/[^a-zA-Z0-9_-]/g, '-')}-${Date.now()}`
        const zoneToUse = targetZone === 'overview' ? 'network' : targetZone

        const newCard: MonitoringCard = {
            id: newCardId,
            title: name || eid.split('.').pop()?.replace(/_/g, ' ') || eid,
            card_type: chosenType,
            cardType: chosenType,
            entity_ids: [eid],
            entityIds: [eid],
            zone_id: zoneToUse,
            zoneId: zoneToUse,
            w: 2,
            h: 2,
            x: 0,
            y: 0,
            hidden: false,
        }

        addCard(newCard)
    }

    const handleRestoreAllMissing = () => {
        if (!config) return
        const existingCardIds = new Set(config.cards.map((c) => c.id))
        const newCards: MonitoringCard[] = [...config.cards]

        allEntities.forEach((ent) => {
            const hasCard = (cardsByEntityId.get(ent.id) || []).length > 0
            if (!hasCard) {
                const eid = ent.id
                const baseCardId = `card-${eid.replace(/[^a-zA-Z0-9_-]/g, '-')}`
                let finalId = baseCardId
                let counter = 1
                while (existingCardIds.has(finalId)) {
                    finalId = `${baseCardId}-${counter++}`
                }
                existingCardIds.add(finalId)

                const cType = getDefaultCardType(eid)
                const isPing = eid.toLowerCase().includes('ping') || eid.toLowerCase().includes('latency')
                const zId = isPing || eid.toLowerCase().includes('speed') ? 'network' : 'overview'

                newCards.push({
                    id: finalId,
                    title: ent.name || eid.split('.').pop()?.replace(/_/g, ' ') || eid,
                    card_type: cType,
                    cardType: cType,
                    entity_ids: [eid],
                    entityIds: [eid],
                    zone_id: zId,
                    zoneId: zId,
                    w: 2,
                    h: 2,
                    x: 0,
                    y: 0,
                    hidden: false,
                })
            }
        })

        saveConfig({
            ...config,
            cards: newCards,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0c1017] border border-neon-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,243,255,0.15)] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                            <Box className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                                Entity Inventory & Card Pool
                                <span className="text-xs px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                                    {allEntities.length} entities available
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400">Manage all discovered sensors and restore or add new cards to your dashboard</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter and Zone Selector Bar */}
                <div className="p-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search entity or sensor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan"
                            />
                        </div>
                        <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="px-3 py-1.5 bg-black/50 border border-white/10 rounded-xl text-xs font-mono text-gray-300 focus:outline-none focus:border-neon-cyan"
                        >
                            <option value="all">All Types</option>
                            <option value="sensor">Sensors (sensor.*)</option>
                            <option value="binary_sensor">Binary Sensors (binary_sensor.*)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">Target Category:</span>
                        <select
                            value={targetZone}
                            onChange={(e) => setTargetZone(e.target.value)}
                            className="px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl text-xs font-mono text-neon-cyan font-bold focus:outline-none"
                        >
                            {(config?.zones || []).map((z) => (
                                <option key={z.id} value={z.id} className="bg-gray-900 text-white">
                                    {z.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleRestoreAllMissing}
                            className="px-3 py-1.5 rounded-xl bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-black text-neon-cyan text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                            title="Add all missing entities to the dashboard as cards"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add All Missing</span>
                        </button>
                    </div>
                </div>

                {/* Entity List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredEntities.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 font-mono text-sm">
                            No matching entities found in inventory.
                        </div>
                    ) : (
                        filteredEntities.map((ent) => {
                            const assignedCards = cardsByEntityId.get(ent.id) || []
                            const hasCard = assignedCards.length > 0
                            const currentVal = entities[ent.id]?.state !== undefined ? entities[ent.id].state : ent.state
                            const currentUnit = entities[ent.id]?.unit_of_measurement || ent.unit_of_measurement || ''
                            const chosenType = cardTypeMap[ent.id] || getDefaultCardType(ent.id)

                            return (
                                <div
                                    key={ent.id}
                                    className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                                        hasCard
                                            ? 'bg-white/[0.02] border-white/5 opacity-80 hover:opacity-100'
                                            : 'bg-neon-cyan/[0.03] border-neon-cyan/20 hover:border-neon-cyan/50 shadow-[0_0_10px_rgba(0,243,255,0.05)]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg border ${
                                            hasCard
                                                ? 'bg-white/5 border-white/10 text-gray-400'
                                                : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
                                        }`}>
                                            {ent.id.toLowerCase().includes('ping') || ent.id.toLowerCase().includes('latency') ? (
                                                <Wifi className="w-4 h-4" />
                                            ) : ent.id.toLowerCase().includes('speed') ? (
                                                <Activity className="w-4 h-4" />
                                            ) : ent.domain === 'binary_sensor' ? (
                                                <Shield className="w-4 h-4" />
                                            ) : (
                                                <Server className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-white">{ent.name}</span>
                                                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                                    {ent.id}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-mono text-neon-cyan">
                                                    Current State: {String(currentVal ?? 'N/A')} {currentUnit}
                                                </span>
                                                {ent.history && ent.history.length > 0 && (
                                                    <span className="text-[10px] font-mono text-gray-400">
                                                        ({ent.history.length} history values)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {hasCard ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Active in: {assignedCards.map((c) => c.zone_id || c.zoneId || 'network').join(', ')}</span>
                                            </div>
                                        ) : null}

                                        {/* Widget Type Selector */}
                                        <select
                                            value={chosenType}
                                            onChange={(e) =>
                                                setCardTypeMap((prev) => ({
                                                    ...prev,
                                                    [ent.id]: e.target.value as CardType,
                                                }))
                                            }
                                            className="px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-gray-300 focus:outline-none focus:border-neon-cyan"
                                        >
                                            <option value="sparkline_card">Trend (Sparkline)</option>
                                            <option value="gauge">Radial Gauge</option>
                                            <option value="live_traffic">Live Traffic Graph</option>
                                            <option value="metric_card">Standard Metric</option>
                                            <option value="simple_value">Simple Value</option>
                                            <option value="linear_bar">Linear Bar</option>
                                            <option value="status_beacon">Status Beacon</option>
                                        </select>

                                        <button
                                            onClick={() => handleAddEntityCard(ent.id, ent.name)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                                                hasCard
                                                    ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                                                    : 'bg-neon-cyan text-black hover:bg-neon-cyan/80 shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                                            }`}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>{hasCard ? 'Add Again' : 'Add as Card'}</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>💡 Tip: If you delete a card from your dashboard, the sensor entity remains here in the inventory and can be restored at any time.</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
