import { LayoutGrid, List, Check, Move, Folder, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'

export type LayoutMode = 'grid' | 'list' | 'compact' | 'categories'

interface LayoutMenuProps {
    currentMode: LayoutMode
    onModeChange: (mode: LayoutMode) => void
    isEditMode: boolean
    onToggleEditMode: () => void
    showHidden: boolean
    onToggleShowHidden: () => void
    isOpen: boolean
    onClose: () => void
}

export function LayoutMenu({ currentMode, onModeChange, isEditMode, onToggleEditMode, showHidden, onToggleShowHidden, isOpen, onClose }: LayoutMenuProps) {
    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-16 right-4 z-50 w-64 glass-panel rounded-xl border border-white/10 shadow-2xl overflow-hidden"
            >
                <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Layout
                    </div>

                    <button
                        onClick={() => onModeChange('grid')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentMode === 'grid' ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/5 text-gray-300'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="flex-1 text-left">Grid View</span>
                        {currentMode === 'grid' && <Check className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={() => onModeChange('list')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentMode === 'list' ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/5 text-gray-300'}`}
                    >
                        <List className="w-4 h-4" />
                        <span className="flex-1 text-left">List View</span>
                        {currentMode === 'list' && <Check className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={() => onModeChange('categories')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentMode === 'categories' ? 'bg-neon-cyan/20 text-neon-cyan' : 'hover:bg-white/5 text-gray-300'}`}
                    >
                        <Folder className="w-4 h-4" />
                        <span className="flex-1 text-left">Category View</span>
                        {currentMode === 'categories' && <Check className="w-4 h-4" />}
                    </button>

                    <div className="h-px bg-white/10 my-2" />

                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Organization
                    </div>

                    <button
                        onClick={() => {
                            onToggleEditMode()
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isEditMode ? 'bg-neon-purple/20 text-neon-purple' : 'hover:bg-white/5 text-gray-300'}`}
                    >
                        <Move className="w-4 h-4" />
                        <span className="flex-1 text-left">Edit / Reorder</span>
                        {isEditMode && <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />}
                    </button>

                    <div className="h-px bg-white/10 my-2" />

                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Hidden Area
                    </div>

                    <button
                        onClick={onToggleShowHidden}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${showHidden ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-gray-300'}`}
                    >
                        {showHidden ? (
                            <>
                                <EyeOff className="w-4 h-4" />
                                <span className="flex-1 text-left">Hide Secret Apps</span>
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                <span className="flex-1 text-left">Show Secret Apps</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </>
    )
}
