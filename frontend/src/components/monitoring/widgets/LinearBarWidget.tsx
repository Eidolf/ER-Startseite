import React from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { SlidersHorizontal } from 'lucide-react'

interface LinearBarWidgetProps {
    title: string
    entity?: MonitoringEntity
    min?: number
    max?: number
}

export const LinearBarWidget: React.FC<LinearBarWidgetProps> = ({
    title,
    entity,
    min = 0,
    max = 100,
}) => {
    const numericVal = typeof entity?.state === 'number' ? entity.state : parseFloat(String(entity?.state || 0))
    const validVal = isNaN(numericVal) ? 0 : numericVal
    const pct = Math.max(0, Math.min(100, ((validVal - min) / (max - min)) * 100))
    const rawVal = entity?.state !== undefined && entity?.state !== null ? String(entity.state) : 'N/A'
    const unit = entity?.unit_of_measurement || '%'

    // Color tier
    const getBarColor = (valPct: number) => {
        if (valPct > 85) return 'from-amber-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
        if (valPct > 65) return 'from-neon-cyan to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
        return 'from-emerald-400 to-neon-cyan shadow-[0_0_12px_rgba(0,243,255,0.4)]'
    }

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-neon-cyan/20 flex flex-col justify-between overflow-hidden group hover:border-neon-cyan/50 transition-all duration-300">
            {/* Corner HUD Marks */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-neon-cyan/60 pointer-events-none" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-neon-cyan/60 pointer-events-none" />

            {/* Header */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-neon-cyan" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate">{title}</span>
                </div>
                <span className="text-[10px] font-mono text-neon-cyan/70">BAR LEVEL</span>
            </div>

            {/* Value & Bar Display */}
            <div className="my-auto w-full flex flex-col gap-2.5 z-10">
                <div className="flex items-baseline justify-between font-mono">
                    <span className="text-2xl font-extrabold text-white">{rawVal}</span>
                    <span className="text-xs text-neon-cyan font-semibold">{unit}</span>
                </div>

                {/* Linear Track */}
                <div className="w-full h-3 bg-black/60 rounded-full p-0.5 border border-white/10 overflow-hidden relative">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${getBarColor(pct)} transition-all duration-500 ease-out`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                <div className="flex justify-between text-[9px] font-mono text-gray-400">
                    <span>MIN {min}</span>
                    <span>{pct.toFixed(0)}% CAPACITY</span>
                    <span>MAX {max}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-1.5 z-10">
                <span className="truncate">ENTITY: {entity?.id || 'sensor.generic'}</span>
            </div>
        </div>
    )
}
