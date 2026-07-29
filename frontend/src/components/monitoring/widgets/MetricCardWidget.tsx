import React from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { Cpu } from 'lucide-react'

interface MetricCardWidgetProps {
    title: string
    entity?: MonitoringEntity
}

export const MetricCardWidget: React.FC<MetricCardWidgetProps> = ({
    title,
    entity,
}) => {
    const rawVal = entity?.state !== undefined && entity?.state !== null && String(entity.state) !== 'NaN' && String(entity.state) !== '' ? String(entity.state) : 'N/A'
    const unit = entity?.unit_of_measurement || ''

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-neon-cyan/20 flex flex-col justify-between overflow-hidden group hover:border-neon-cyan/50 transition-all duration-300">
            {/* Corner HUD Marks */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-neon-cyan/60 pointer-events-none" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-neon-cyan/60 pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-neon-cyan/60 pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-neon-cyan/60 pointer-events-none" />

            {/* Header */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-neon-cyan" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate">{title}</span>
                </div>
                <span className="text-[10px] font-mono text-neon-cyan/70">METRIC</span>
            </div>

            {/* Value Display */}
            <div className="my-auto flex items-baseline gap-2 z-10">
                <span className="text-3xl font-extrabold font-mono text-white tracking-tight" style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.4)' }}>
                    {rawVal}
                </span>
                {unit && <span className="text-xs font-mono text-neon-cyan uppercase">{unit}</span>}
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-1.5 z-10">
                <span>ENTITY: {entity?.id || 'sensor.generic'}</span>
                <span>UPDATED: RECENT</span>
            </div>
        </div>
    )
}
