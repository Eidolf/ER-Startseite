import React from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { Hash } from 'lucide-react'

interface SimpleValueWidgetProps {
    title: string
    entity?: MonitoringEntity
}

export const SimpleValueWidget: React.FC<SimpleValueWidgetProps> = ({
    title,
    entity,
}) => {
    const rawVal =
        entity?.state !== undefined &&
        entity?.state !== null &&
        String(entity.state) !== 'NaN' &&
        String(entity.state) !== ''
            ? String(entity.state)
            : 'N/A'
    const unit = entity?.unit_of_measurement || ''

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-white/10 flex flex-col justify-between overflow-hidden group hover:border-white/20 transition-all duration-300">
            {/* Header */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-300 truncate">{title}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 uppercase">VALUE</span>
            </div>

            {/* Main Value Display */}
            <div className="my-auto flex items-baseline gap-2 z-10">
                <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                    {rawVal}
                </span>
                {unit && <span className="text-sm font-mono text-gray-400 uppercase">{unit}</span>}
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-500 border-t border-white/5 pt-1.5 z-10">
                <span className="truncate">{entity?.id || 'sensor.generic'}</span>
            </div>
        </div>
    )
}
