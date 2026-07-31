import React, { useState, useEffect } from 'react'
import { MonitoringEntity } from '../../../types/monitoring'
import { TrendingUp, Activity } from 'lucide-react'

interface SparklineWidgetProps {
    title: string
    entity?: MonitoringEntity
}

export const SparklineWidget: React.FC<SparklineWidgetProps> = ({
    title,
    entity,
}) => {
    const [history, setHistory] = useState<number[]>([40, 42, 38, 45, 48, 52, 50, 55, 53, 58])

    const numericVal = typeof entity?.state === 'number' ? entity.state : parseFloat(String(entity?.state || 0))
    const validVal = isNaN(numericVal) ? 0 : numericVal
    const rawVal = entity?.state !== undefined && entity?.state !== null ? String(entity.state) : 'N/A'
    const unit = entity?.unit_of_measurement || ''

    useEffect(() => {
        if (!isNaN(numericVal)) {
            setHistory((prev) => [...prev.slice(-14), validVal])
        }
    }, [numericVal, validVal])

    const minHist = Math.min(...history)
    const maxHist = Math.max(...history)
    const range = maxHist - minHist || 1

    // Build SVG path
    const points = history.map((val, idx) => {
        const x = (idx / (history.length - 1)) * 260
        const y = 50 - ((val - minHist) / range) * 40
        return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    return (
        <div className="relative w-full h-full p-4 glass-panel rounded-2xl border border-neon-cyan/20 flex flex-col justify-between overflow-hidden group hover:border-neon-cyan/50 transition-all duration-300">
            {/* Corner HUD Marks */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-neon-cyan/60 pointer-events-none" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-neon-cyan/60 pointer-events-none" />

            {/* Header */}
            <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-neon-cyan" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-200 truncate">{title}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <Activity className="w-3 h-3 animate-pulse" />
                    <span>SPARK</span>
                </div>
            </div>

            {/* Value & Sparkline Chart */}
            <div className="my-auto w-full flex flex-col gap-2 z-10">
                <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-3xl font-extrabold text-white" style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.4)' }}>
                        {rawVal}
                    </span>
                    {unit && <span className="text-xs text-neon-cyan font-semibold uppercase">{unit}</span>}
                </div>

                {/* SVG Mini Trendline */}
                <div className="w-full h-12 relative overflow-hidden flex items-center">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 260 55" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`sparkGrad-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#00f3ff" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={`0,55 ${points} 260,55`}
                            fill={`url(#sparkGrad-${title.replace(/[^a-zA-Z0-9]/g, '')})`}
                        />
                        <polyline
                            fill="none"
                            stroke="#00f3ff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points}
                        />
                    </svg>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-between text-[10px] font-mono text-gray-400 border-t border-white/10 pt-1.5 z-10">
                <span className="truncate">ENTITY: {entity?.id || 'sensor.generic'}</span>
                <span>TREND: LIVE</span>
            </div>
        </div>
    )
}
