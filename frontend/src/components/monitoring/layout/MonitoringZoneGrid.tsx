import React from 'react'
import { useMonitoring } from '../MonitoringContext'
import { RadialGaugeWidget } from '../widgets/RadialGaugeWidget'
import { LiveTrafficGraphWidget } from '../widgets/LiveTrafficGraphWidget'
import { StatusBeaconWidget } from '../widgets/StatusBeaconWidget'
import { MetricCardWidget } from '../widgets/MetricCardWidget'
import { Trash, Plus } from 'lucide-react'

interface MonitoringZoneGridProps {
    onOpenImport: () => void
}

export const MonitoringZoneGrid: React.FC<MonitoringZoneGridProps> = ({ onOpenImport }) => {
    const { config, activeZoneId, entities, isEditMode, deleteCard } = useMonitoring()

    if (!config) return null

    const zoneCards = config.cards.filter((c) => c.zone_id === activeZoneId || activeZoneId === 'overview')
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
                    {zoneCards.map((card) => {
                        const primaryEntityId = card.entity_ids[0]
                        const entity = primaryEntityId ? entities[primaryEntityId] : undefined

                        return (
                            <div key={card.id} className="relative group w-full h-full">
                                {card.card_type === 'live_traffic' && (
                                    <LiveTrafficGraphWidget title={card.title} entity={entity} />
                                )}
                                {card.card_type === 'gauge' && (
                                    <RadialGaugeWidget title={card.title} entity={entity} min={0} max={100} />
                                )}
                                {card.card_type === 'status_beacon' && (
                                    <StatusBeaconWidget title={card.title} entity={entity} />
                                )}
                                {card.card_type === 'metric_card' && (
                                    <MetricCardWidget title={card.title} entity={entity} />
                                )}

                                {/* Admin Delete Button */}
                                {isEditMode && (
                                    <button
                                        onClick={() => deleteCard(card.id)}
                                        className="absolute -top-2 -right-2 z-30 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition"
                                        title="Delete Card"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
