import React, { useState, useEffect } from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { ArrowDownRight, ArrowUpRight, Zap } from 'lucide-react'

interface LiveTrafficGraphWidgetProps {
    title: string
    entity?: MonitoringEntity
}

export const LiveTrafficGraphWidget: React.FC<LiveTrafficGraphWidgetProps> = ({
    title,
    entity,
}) => {
    const isNumeric = typeof entity?.state === 'number' || (typeof entity?.state === 'string' && entity?.state !== 'N/A' && entity?.state !== 'NaN' && !isNaN(parseFloat(entity.state)))
    const parsed = isNumeric ? (typeof entity?.state === 'number' ? entity.state : parseFloat(String(entity?.state))) : 0
    const rawValue = isNaN(parsed) ? 0 : parsed
    const displayVal = isNumeric && !isNaN(rawValue) ? rawValue.toFixed(1) : (entity?.state !== undefined && entity?.state !== null && String(entity.state) !== 'NaN' ? String(entity.state) : 'N/A')
    const unit = entity?.unit_of_measurement || 'Mbit/s'
    const isUpload = title.toLowerCase().includes('upload')
    const isPing = title.toLowerCase().includes('ping') || title.toLowerCase().includes('latency')

    const [history, setHistory] = useState<number[]>(() => [0, 0, 0, 0, 0, 0, 0, 0, 0, rawValue])

    useEffect(() => {
        setHistory((prev) => [...prev.slice(1), rawValue])
    }, [rawValue])

    const initialMax = isPing ? 100 : 1
    const maxVal = Math.max(...history, rawValue, initialMax)
    const points = history
        .map((val, idx) => {
            const x = (idx / (history.length - 1)) * 260
            const y = 80 - (val / maxVal) * 70
            return `${x},${y}`
        })
        .join(' ')

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-neon-cyan/20 flex flex-col justify-between overflow-hidden group hover:border-neon-cyan/50 transition-all duration-300">
            {/* Ambient Background Pulse */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    {isUpload ? (
                        <div className="p-1 rounded bg-neon-purple/20 border border-neon-purple/40">
                            <ArrowUpRight className="w-4 h-4 text-neon-purple" />
                        </div>
                    ) : (
                        <div className="p-1 rounded bg-neon-cyan/20 border border-neon-cyan/40">
                            <ArrowDownRight className="w-4 h-4 text-neon-cyan" />
                        </div>
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-neon-cyan">LIVE STREAM</span>
                </div>
            </div>

            {/* Main Numeric Telemetry */}
            <div className="my-2 flex items-baseline gap-2 z-10">
                <span
                    className="text-4xl font-extrabold font-mono text-white tracking-tight"
                    style={{ textShadow: '0 0 12px rgba(0, 243, 255, 0.4)' }}
                >
                    {displayVal}
                </span>
                <span className="text-xs font-mono font-medium text-neon-cyan/90 uppercase">{unit}</span>
            </div>

            {/* Waveform SVG Graph */}
            <div className="relative w-full h-20 my-1 z-10 overflow-hidden">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 260 80" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={isUpload ? '#9d00ff' : '#00f3ff'} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={isUpload ? '#9d00ff' : '#00f3ff'} stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    <polygon
                        points={`0,80 ${points} 260,80`}
                        fill={`url(#grad-${title.replace(/\s+/g, '-')})`}
                    />
                    <polyline
                        fill="none"
                        stroke={isUpload ? '#9d00ff' : '#00f3ff'}
                        strokeWidth="2.5"
                        points={points}
                        style={{ filter: `drop-shadow(0 0 4px ${isUpload ? '#9d00ff' : '#00f3ff'})` }}
                    />
                </svg>
            </div>

            {/* Footer Metrics */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-1.5 z-10">
                <span>PEAK: {maxVal.toFixed(1)} {unit}</span>
                <span>STATUS: NOMINAL</span>
            </div>
        </div>
    )
}
