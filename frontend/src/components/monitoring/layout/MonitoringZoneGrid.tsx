import React from 'react'
import { useMonitoring } from '../MonitoringContext'
import { RadialGaugeWidget } from '../widgets/RadialGaugeWidget'
import { LiveTrafficGraphWidget } from '../widgets/LiveTrafficGraphWidget'
import { StatusBeaconWidget } from '../widgets/StatusBeaconWidget'
import { MetricCardWidget } from '../widgets/MetricCardWidget'
import { Trash, Plus, ChevronUp, ChevronDown, FolderInput, Eye, EyeOff } from 'lucide-react'

interface MonitoringZoneGridProps {
    onOpenImport: () => void
}

export const MonitoringZoneGrid: React.FC<MonitoringZoneGridProps> = ({ onOpenImport }) => {
    const { config, activeZoneId, entities, isEditMode, deleteCard, updateCardZone, moveCardOrder, toggleCardVisibility } = useMonitoring()

    if (!config) return null

    const zoneCards = config.cards.filter((c) => {
        const zId = c.zone_id || c.zoneId || 'network'
        const matchesZone = zId === activeZoneId || activeZoneId === 'overview'
        return matchesZone && (isEditMode || !c.hidden)
    })
    const count = zoneCards.length

    // Dynamic layout grid columns based on entity count
    let gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    if (count <= 4) {
        gridColsClass = 'grid-cols-1 md:grid-cols-2'
    } else if (count > 30) {
        gridColsClass = 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
    }

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Cards Grid */}
            {zoneCards.length === 0 ? (
                <div className="w-full py-16 glass-panel rounded-2xl border border-dashed border-neon-cyan/30 flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-sm font-mono text-gray-300">No monitoring cards configured in this zone.</p>
                    <button
                        onClick={onOpenImport}
                        className="px-4 py-2 rounded-xl bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-xs font-bold uppercase tracking-wider hover:bg-neon-cyan hover:text-black transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Import Varco / Add Sensors
                    </button>
                </div>
            ) : (
                <div className={`grid ${gridColsClass} gap-4 auto-rows-[220px]`}>
                    {zoneCards.map((card, idx) => {
                        const entIds = card.entity_ids || card.entityIds || []
                        const primaryEntityId = entIds[0]
                        const entity = primaryEntityId ? entities[primaryEntityId] : undefined
                        const cType = card.card_type || card.cardType

                        return (
                            <div key={card.id} className="relative group w-full h-full">
                                {(cType === 'live_traffic' || !cType) && (
                                    <LiveTrafficGraphWidget title={card.title} entity={entity} />
                                )}
                                {cType === 'gauge' && (
                                    <RadialGaugeWidget title={card.title} entity={entity} min={0} max={100} />
                                )}
                                {cType === 'status_beacon' && (
                                    <StatusBeaconWidget title={card.title} entity={entity} />
                                )}
                                {cType === 'metric_card' && (
                                    <MetricCardWidget title={card.title} entity={entity} />
                                )}

                                {/* Admin Card Edit Toolbar */}
                                {isEditMode && (
                                    <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/90 p-1 rounded-xl border border-neon-cyan/60 shadow-xl backdrop-blur-md">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-neon-cyan/10 border border-neon-cyan/40 rounded-lg">
                                            <FolderInput className="w-3 h-3 text-neon-cyan" />
                                            <select
                                                value={card.zone_id || card.zoneId || 'network'}
                                                onChange={(e) => updateCardZone(card.id, e.target.value)}
                                                className="bg-transparent text-[10px] font-mono text-neon-cyan focus:outline-none cursor-pointer"
                                            >
                                                {config.zones.map((z) => (
                                                    <option key={z.id} value={z.id} className="bg-gray-900 text-white">
                                                        {z.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => moveCardOrder(card.id, 'up')}
                                            disabled={idx === 0}
                                            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-30"
                                            title="Move Left / Up"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            onClick={() => moveCardOrder(card.id, 'down')}
                                            disabled={idx === zoneCards.length - 1}
                                            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-30"
                                            title="Move Right / Down"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            onClick={() => toggleCardVisibility(card.id)}
                                            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                                            title={card.hidden ? 'Karte einblenden' : 'Karte ausblenden'}
                                        >
                                            {card.hidden ? <EyeOff className="w-3.5 h-3.5 text-red-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                                        </button>

                                        <button
                                            onClick={() => deleteCard(card.id)}
                                            className="p-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition"
                                            title="Delete Card"
                                        >
                                            <Trash className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
