import { X } from 'lucide-react'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    currentTitle: string
    onTitleChange: (newTitle: string) => void
    onBgToggle: () => void
    bgType: 'image' | 'video'
}

export function SettingsModal({
    isOpen,
    onClose,
    currentTitle,
    onTitleChange,
    onBgToggle,
    bgType
}: SettingsModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md glass-panel rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-neon-cyan mb-6">Settings</h2>

                <div className="space-y-6">
                    {/* Title Setting */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Page Title</label>
                        <input
                            type="text"
                            value={currentTitle}
                            onChange={(e) => onTitleChange(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-neon-cyan/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                            placeholder="Enter dashboard title..."
                        />
                    </div>

                    {/* Background Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-sm font-medium text-gray-300">Video Background</span>
                        <button
                            onClick={onBgToggle}
                            className={`w-12 h-6 rounded-full transition-colors relative ${bgType === 'video' ? 'bg-neon-cyan' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${bgType === 'video' ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
