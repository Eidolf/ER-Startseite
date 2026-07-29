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
    Sparkles,
} from 'lucide-react'
import { OverlayWidthPercent } from '../../types/monitoring'

interface MonitoringOverlayProps {
    isAuthenticated?: boolean
    onRequireAuth?: (action: 'edit_mode' | 'settings') => void
}

export const MonitoringOverlay: React.FC<MonitoringOverlayProps> = ({
    isAuthenticated = true,
    onRequireAuth,
}) => {
    const {
        isOpen,
        setIsOpen,
        widthPercent,
        setWidthPercent,
        activeZoneId,
        setActiveZoneId,
        config,
        isSystemOnline,
        isEditMode,
        setIsEditMode,
        pairingCode,
        clearPairingCode,
        toggleDemoMode,
        refreshConfig,
    } = useMonitoring()

    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [dragWidth, setDragWidth] = useState<number | null>(null)

    if (!isOpen) return null

    const handleAdminAction = (action: () => void) => {
        if (!isAuthenticated && onRequireAuth) {
            onRequireAuth('edit_mode')
            return
        }
        action()
    }

    const effectiveEditMode = isAuthenticated ? isEditMode : false

    const widthClasses: Record<OverlayWidthPercent, string> = {
        25: 'w-full md:w-[25vw]',
        50: 'w-full md:w-[50vw]',
        75: 'w-full md:w-[75vw]',
        100: 'w-full md:w-[100vw]',
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()

        let hasDragged = false
        const initialX = e.clientX

        const handlePointerMove = (moveEv: PointerEvent) => {
            const deltaX = Math.abs(moveEv.clientX - initialX)
            if (deltaX > 5) {
                hasDragged = true
            }

            const currentPx = moveEv.clientX
            const windowWidth = window.innerWidth
            const rawPct = (currentPx / windowWidth) * 100
            const clampedPct = Math.max(15, Math.min(100, rawPct))
            setDragWidth(clampedPct)
        }

        const handlePointerUp = (upEv: PointerEvent) => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
            setDragWidth(null)

            if (!hasDragged) {
                setIsOpen(false)
                return
            }

            const finalPx = upEv.clientX
            const windowWidth = window.innerWidth
            const finalPct = (finalPx / windowWidth) * 100

            const snapPoints: { min: number; max: number; val: OverlayWidthPercent | 0 }[] = [
                { min: -Infinity, max: 12.5, val: 0 },
                { min: 12.5, max: 37.5, val: 25 },
                { min: 37.5, max: 62.5, val: 50 },
                { min: 62.5, max: 87.5, val: 75 },
                { min: 87.5, max: Infinity, val: 100 },
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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                />

                <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={dragWidth !== null ? { width: `${dragWidth}vw` } : undefined}
                    className={`relative h-full ${dragWidth === null ? widthClasses[widthPercent] : ''} bg-[#050914]/95 border-r border-neon-cyan/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] pointer-events-auto flex flex-col justify-between overflow-hidden z-50 transition-all ${dragWidth !== null ? 'duration-75 select-none' : 'duration-300'}`}
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent animate-pulse" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f3ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f3ff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                    <div className="relative p-6 border-b border-white/10 flex flex-col gap-4 z-10 bg-black/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                                    <Radio className="w-6 h-6 text-neon-cyan animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-black tracking-widest text-white uppercase" style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.5)' }}>
                                            MONITORING COMMAND BRIDGE
                                        </h2>
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono ${isSystemOnline ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isSystemOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500 animate-ping'}`} />
                                            <span>{isSystemOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-mono text-neon-cyan/80">VARCO / HOMELAB NOC OVERLAY v2.0</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {isAuthenticated && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAdminAction(toggleDemoMode)
                                        }}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                                            config?.demoMode !== false
                                                ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]'
                                                : 'bg-gray-800/60 border-gray-700 text-gray-400'
                                        }`}
                                        title="Toggle Live Demo Jitter Simulation"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {config?.demoMode !== false ? 'Demo ON' : 'Demo OFF'}
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleAdminAction(() => setIsImportModalOpen(true))
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan hover:text-black transition text-xs font-mono font-bold flex items-center gap-1.5"
                                    title={isAuthenticated ? 'Import Varco Manifest or Brief' : 'Admin Lock (Login Required)'}
                                >
                                    <FileUp className="w-4 h-4" />
                                    Import
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleAdminAction(() => setIsEditMode(!isEditMode))
                                    }}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition ${effectiveEditMode ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                                >
                                    {effectiveEditMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                    {effectiveEditMode ? 'Done' : 'Edit Layout'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {config?.zones.map((zone) => {
                                const isActive = activeZoneId === zone.id
                                return (
                                    <button
                                        key={zone.id}
                                        onClick={() => setActiveZoneId(zone.id)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-2 ${
                                            isActive
                                                ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,243,255,0.4)] font-bold'
                                                : 'bg-black/40 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        {zone.id === 'overview' && <Activity className="w-3.5 h-3.5" />}
                                        {zone.id === 'network' && <Wifi className="w-3.5 h-3.5" />}
                                        {zone.id === 'infrastructure' && <Server className="w-3.5 h-3.5" />}
                                        {zone.id === 'smarthome' && <HomeIcon className="w-3.5 h-3.5" />}
                                        {zone.id === 'security' && <Shield className="w-3.5 h-3.5" />}
                                        {zone.id === 'custom' && <Sliders className="w-3.5 h-3.5" />}
                                        {zone.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="relative flex-1 p-6 overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-neon-cyan/20">
                        <MonitoringZoneGrid onOpenImport={() => handleAdminAction(() => setIsImportModalOpen(true))} />
                    </div>

                    <div className="relative p-4 border-t border-white/10 bg-black/50 flex items-center justify-between z-10">
                        <div className="flex items-center gap-4 text-[11px] font-mono text-gray-400">
                            <span className={`flex items-center gap-1 ${isSystemOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${isSystemOnline ? 'bg-emerald-400 animate-ping' : 'bg-red-500 animate-pulse'}`} />
                                {isSystemOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                            </span>
                            <span>LATENCY: 14ms</span>
                        </div>

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

                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={() => refreshConfig()}
                />

                {/* Pairing Code Verification Overlay */}
                {pairingCode && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="relative max-w-md w-full p-6 glass-panel rounded-2xl border-2 border-neon-cyan/80 shadow-[0_0_50px_rgba(0,243,255,0.4)] flex flex-col items-center text-center space-y-4">
                            <button
                                onClick={() => clearPairingCode()}
                                className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
                                title="Schließen"
                            >
                                ✕
                            </button>
                            <div className="p-3 rounded-full bg-neon-cyan/20 border border-neon-cyan/50 animate-pulse">
                                <Shield className="w-8 h-8 text-neon-cyan" />
                            </div>
                            <h3 className="text-lg font-black tracking-wider text-white uppercase">
                                Home Assistant Varco Pairing Code
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                Bitte vergleiche und bestätige diesen Pairing-Code in deiner Home Assistant Varco Integration:
                            </p>
                            <div className="px-6 py-3 rounded-xl bg-black/90 border border-neon-cyan/60 text-4xl font-mono font-bold tracking-[0.3em] text-neon-cyan shadow-inner">
                                {pairingCode}
                            </div>
                            <p className="text-[11px] text-gray-400 font-mono">
                                Warte auf Freigabe in Home Assistant...
                            </p>
                            <button
                                onClick={() => clearPairingCode()}
                                className="mt-2 px-5 py-2 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan hover:text-black border border-neon-cyan/50 text-neon-cyan font-mono text-xs font-bold transition"
                            >
                                Code bestätigt / Schließen
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AnimatePresence>
    )
}
