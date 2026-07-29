import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMonitoring } from './MonitoringContext'
import { MonitoringZoneGrid } from './layout/MonitoringZoneGrid'
import { ImportModal } from './ImportModal'
import {
    Activity,
    Wifi,
    Server,
    Home as HomeIcon,
    Shield,
    Sliders,
    ChevronLeft,
    FileUp,
    Edit2,
    Check,
    Radio,
    Maximize2,
    GripVertical,
} from 'lucide-react'
import { OverlayWidthPercent } from '../../types/monitoring'

export const MonitoringOverlay: React.FC = () => {
    const {
        isOpen,
        setIsOpen,
        widthPercent,
        setWidthPercent,
        activeZoneId,
        setActiveZoneId,
        config,
        isEditMode,
        setIsEditMode,
        refreshConfig,
    } = useMonitoring()

    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [dragWidth, setDragWidth] = useState<number | null>(null)

    if (!isOpen) return null

    const widthClasses: Record<OverlayWidthPercent, string> = {
        25: 'w-full md:w-[25vw]',
        50: 'w-full md:w-[50vw]',
        75: 'w-full md:w-[75vw]',
        100: 'w-full md:w-[100vw]',
    }

    const zoneIcons: Record<string, React.ReactNode> = {
        overview: <Activity className="w-4 h-4" />,
        network: <Wifi className="w-4 h-4" />,
        infrastructure: <Server className="w-4 h-4" />,
        smarthome: <HomeIcon className="w-4 h-4" />,
        security: <Shield className="w-4 h-4" />,
        custom: <Sliders className="w-4 h-4" />,
    }

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const startX = e.clientX
        let hasMoved = false

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const diffX = Math.abs(moveEvent.clientX - startX)
            if (diffX > 5) {
                hasMoved = true
            }

            const pct = Math.max(0, Math.min(100, (moveEvent.clientX / window.innerWidth) * 100))
            setDragWidth(pct)
        }

        const handlePointerUp = (upEvent: PointerEvent) => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
            setDragWidth(null)

            if (!hasMoved) {
                setIsOpen(false)
                return
            }

            const finalPct = (upEvent.clientX / window.innerWidth) * 100

            const snapPoints: Array<{ val: OverlayWidthPercent | 0; min: number; max: number }> = [
                { val: 0, min: -Infinity, max: 12.5 },
                { val: 25, min: 12.5, max: 37.5 },
                { val: 50, min: 37.5, max: 62.5 },
                { val: 75, min: 62.5, max: 87.5 },
                { val: 100, min: 87.5, max: Infinity },
            ]

            const matched = snapPoints.find((sp) => finalPct >= sp.min && finalPct < sp.max)
            if (matched) {
                if (matched.val === 0) {
                    setIsOpen(false)
                } else {
                    setWidthPercent(matched.val)
                }
            }
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 pointer-events-none flex">
                {/* Backdrop overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                />

                {/* Futuristic Side Bridge Command Overlay */}
                <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={dragWidth !== null ? { width: `${dragWidth}vw` } : undefined}
                    className={`relative h-full ${dragWidth === null ? widthClasses[widthPercent] : ''} bg-[#050914]/95 border-r border-neon-cyan/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] pointer-events-auto flex flex-col justify-between overflow-hidden z-50 transition-all ${dragWidth !== null ? 'duration-75 select-none' : 'duration-300'}`}
                >
                    {/* Sci-Fi Scanning Effect Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse" />

                    {/* Holographic Mesh Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f3ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f3ff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                    {/* Top Console Command Header */}
                    <div className="relative p-6 border-b border-white/10 flex flex-col gap-4 z-10 bg-black/40">
                        {/* Title & Operations Telemetry Status */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                                    <Radio className="w-6 h-6 text-neon-cyan animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-2" style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}>
                                        MONITORING COMMAND BRIDGE
                                    </h2>
                                    <p className="text-[10px] font-mono text-neon-cyan/80">VARCO / HOMELAB NOC OVERLAY v2.0</p>
                                </div>
                            </div>

                            {/* Control Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan hover:text-black transition text-xs font-mono font-bold flex items-center gap-1.5"
                                    title="Import Varco Manifest or Brief"
                                >
                                    <FileUp className="w-4 h-4" />
                                    Import
                                </button>
                                <button
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition ${isEditMode ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                                >
                                    {isEditMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                    {isEditMode ? 'Done' : 'Edit Layout'}
                                </button>
                            </div>
                        </div>

                        {/* Zone Navigation Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {config?.zones.map((zone) => {
                                const isActive = activeZoneId === zone.id
                                return (
                                    <button
                                        key={zone.id}
                                        onClick={() => setActiveZoneId(zone.id)}
                                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition whitespace-nowrap ${isActive ? 'bg-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_12px_rgba(0,243,255,0.4)]' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                                    >
                                        {zoneIcons[zone.id] || <Activity className="w-4 h-4" />}
                                        {zone.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Main Monitoring Zone Grid Content */}
                    <div className="relative flex-1 p-6 overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-neon-cyan/20">
                        <MonitoringZoneGrid onOpenImport={() => setIsImportModalOpen(true)} />
                    </div>

                    {/* Bottom Console Footer & Width Scale Switcher */}
                    <div className="relative p-4 border-t border-white/10 bg-black/50 flex items-center justify-between z-10">
                        <div className="flex items-center gap-4 text-[11px] font-mono text-gray-400">
                            <span className="flex items-center gap-1 text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                SYSTEM ONLINE
                            </span>
                            <span>LATENCY: 14ms</span>
                        </div>

                        {/* Width Scaling Controls */}
                        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10">
                            <Maximize2 className="w-3.5 h-3.5 text-gray-400 mr-1" />
                            {([25, 50, 75, 100] as OverlayWidthPercent[]).map((w) => (
                                <button
                                    key={w}
                                    onClick={() => setWidthPercent(w)}
                                    className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold transition ${widthPercent === w ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {w}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Screen Drag & Snap Handle */}
                    <div
                        onPointerDown={handlePointerDown}
                        className="absolute top-1/2 -right-7 transform -translate-y-1/2 z-50 py-3 px-1.5 rounded-r-xl bg-neon-cyan/20 border-r border-t border-b border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition shadow-[0_0_20px_rgba(0,243,255,0.4)] group cursor-col-resize touch-none flex items-center justify-center"
                        title="Ziehen zum Anpassen / Einklinken (0%, 25%, 50%, 75%, 100%) | Klick = Schließen"
                    >
                        <div className="flex items-center gap-0.5">
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <GripVertical className="w-4 h-4 text-neon-cyan group-hover:text-black transition" />
                        </div>
                    </div>
                </motion.div>

                {/* Import Modal */}
                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={() => refreshConfig()}
                />
            </div>
        </AnimatePresence>
    )
}
