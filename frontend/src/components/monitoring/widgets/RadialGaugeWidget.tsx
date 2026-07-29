import React from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { Activity } from 'lucide-react'

interface RadialGaugeWidgetProps {
    title: string
    entity?: MonitoringEntity
    min?: number
    max?: number
}

export const RadialGaugeWidget: React.FC<RadialGaugeWidgetProps> = ({
    title,
    entity,
    min = 0,
    max = 100,
}) => {
    const rawVal = typeof entity?.state === 'number' ? entity.state : parseFloat(String(entity?.state || 0)) || 0
    const value = Math.max(min, Math.min(max, rawVal))
    const percentage = Math.round(((value - min) / (max - min)) * 100)
    const unit = entity?.unit_of_measurement || 'ms'

    // Status color
    let strokeColor = '#00f3ff' // Cyan (normal)
    let glowColor = 'rgba(0, 243, 255, 0.4)'
    if (percentage > 80) {
        strokeColor = '#ef4444' // Red (critical)
        glowColor = 'rgba(239, 68, 68, 0.5)'
    } else if (percentage > 50) {
        strokeColor = '#f59e0b' // Amber (warning)
        glowColor = 'rgba(245, 158, 11, 0.5)'
    }

    const radius = 38
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-neon-cyan/20 flex flex-col items-center justify-between overflow-hidden group hover:border-neon-cyan/50 transition-all duration-300">
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: glowColor }} />

            {/* Title & Status */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-neon-cyan animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate">{title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: strokeColor }} />
                    <span className="text-[10px] font-mono text-gray-400">LIVE</span>
                </div>
            </div>

            {/* Radial Gauge SVG */}
            <div className="relative w-28 h-28 flex items-center justify-center my-2 z-10">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-white/10"
                        strokeWidth="8"
                        fill="transparent"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={strokeColor}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}
                    />
                </svg>

                {/* Center Digital Telemetry Display */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold font-mono text-white tracking-tight" style={{ textShadow: `0 0 10px ${glowColor}` }}>
                        {value.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-mono text-neon-cyan/80 uppercase">{unit}</span>
                </div>
            </div>

            {/* Bottom HUD Bar */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-1.5 z-10">
                <span>MIN: {min}</span>
                <span>MAX: {max}</span>
            </div>
        </div>
    )
}
