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
    const isNumeric = typeof entity?.state === 'number' || (typeof entity?.state === 'string' && entity?.state !== 'N/A' && entity?.state !== 'NaN' && !isNaN(parseFloat(entity.state)))
    const parsedVal = isNumeric ? (typeof entity?.state === 'number' ? entity.state : parseFloat(String(entity?.state))) : 0
    const safeVal = isNaN(parsedVal) ? 0 : parsedVal
    const effectiveMax = safeVal > max ? Math.ceil(safeVal * 1.2) : max
    const value = Math.max(min, Math.min(effectiveMax, safeVal))
    const percentage = isNumeric && !isNaN(value) ? Math.round(((value - min) / (effectiveMax - min)) * 100) : 0
    const displayVal = isNumeric && !isNaN(value) ? value.toFixed(1) : (entity?.state !== undefined && entity?.state !== null && String(entity.state) !== 'NaN' ? String(entity.state) : 'N/A')
    const unit = entity?.unit_of_measurement || ''

    const isPing = title.toLowerCase().includes('ping') || title.toLowerCase().includes('latency')

    // Status color
    let strokeColor = '#00f3ff' // Cyan (normal)
    let glowColor = 'rgba(0, 243, 255, 0.4)'

    if (isPing) {
        // Ping/Latency: lower value is better!
        if (safeVal > 80) {
            strokeColor = '#ef4444' // Red (high latency > 80ms)
            glowColor = 'rgba(239, 68, 68, 0.5)'
        } else if (safeVal > 40) {
            strokeColor = '#f59e0b' // Amber (medium latency 40-80ms)
            glowColor = 'rgba(245, 158, 11, 0.5)'
        } else {
            strokeColor = '#00ff9d' // Green (excellent low latency < 40ms)
            glowColor = 'rgba(0, 255, 157, 0.4)'
        }
    } else {
        // Bandwidth/Throughput: higher value is better
        if (percentage > 80) {
            strokeColor = '#00ff9d' // Green (high bandwidth)
            glowColor = 'rgba(0, 255, 157, 0.4)'
        } else if (percentage > 20) {
            strokeColor = '#00f3ff' // Cyan (normal)
            glowColor = 'rgba(0, 243, 255, 0.4)'
        } else {
            strokeColor = '#f59e0b' // Amber (low)
            glowColor = 'rgba(245, 158, 11, 0.5)'
        }
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
                    <span className="text-[10px] font-mono text-gray-300">
                        {entity?.last_updated ? new Date(entity.last_updated).toLocaleTimeString() : 'LIVE'}
                    </span>
                </div>
            </div>

            {/* Radial Gauge SVG */}
            <div className="relative w-28 h-28 flex items-center justify-center my-2 z-10">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="rgba(255, 255, 255, 0.1)"
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
                    <span className="text-xl font-bold font-mono text-white tracking-tight" style={{ textShadow: `0 0 10px ${glowColor}` }}>
                        {displayVal}
                    </span>
                    {unit && <span className="text-[10px] font-mono text-neon-cyan/80 uppercase">{unit}</span>}
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
