import React from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { useMonitoring } from '../useMonitoring'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface StatusBeaconWidgetProps {
    title: string
    entity?: MonitoringEntity
}

export const StatusBeaconWidget: React.FC<StatusBeaconWidgetProps> = ({
    title,
    entity,
}) => {
    const { isSystemOnline } = useMonitoring()
    const isOnline = entity?.state !== undefined && entity?.state !== null && entity?.state !== 'N/A'
        ? (entity?.state === true || String(entity?.state).toLowerCase() === 'on' || String(entity?.state).toLowerCase() === 'online')
        : isSystemOnline
    const color = isOnline ? '#10b981' : '#ef4444'

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-neon-cyan/20 flex flex-col justify-between overflow-hidden group hover:border-neon-cyan/50 transition-all duration-300">
            {/* Holographic Background Glow */}
            <div
                className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full blur-2xl pointer-events-none"
                style={{ backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)' }}
            />

            {/* Header */}
            <div className="w-full flex items-center justify-between z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate">{title}</span>
                <span className="text-[10px] font-mono text-gray-400">BEACON</span>
            </div>

            {/* Holographic Ring & Status Icon */}
            <div className="my-auto flex flex-col items-center justify-center gap-2 z-10">
                <div className="relative flex items-center justify-center">
                    <div
                        className="w-16 h-16 rounded-full border-2 border-dashed animate-[spin_8s_linear_infinite]"
                        style={{ borderColor: color }}
                    />
                    <div
                        className="absolute w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}` }}
                    >
                        {isOnline ? (
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        ) : (
                            <ShieldAlert className="w-6 h-6 text-red-400" />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: color }} />
                    <span className="text-sm font-extrabold font-mono uppercase tracking-widest text-white">
                        {isOnline ? 'ONLINE / HEALTHY' : 'OFFLINE / ALERT'}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-1.5 z-10">
                <span>ENTITY: {entity?.id || 'sensor.system'}</span>
                <span>STATUS CODE: 200</span>
            </div>
        </div>
    )
}
