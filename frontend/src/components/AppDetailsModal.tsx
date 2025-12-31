
import { AppData } from '../App'
import { AppIcon } from './AppIcon'
import { X, ExternalLink } from 'lucide-react'

interface AppDetailsModalProps {
    app: AppData | null
    isOpen: boolean
    onClose: () => void
}

export function AppDetailsModal({ app, isOpen, onClose }: AppDetailsModalProps) {
    if (!isOpen || !app) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        App Details
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Icon & Name */}
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center p-3 shrink-0">
                            <AppIcon src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-bold text-white truncate text-glow">{app.name}</h3>
                            {app.type === 'folder' ? (
                                <span className="text-neon-cyan text-sm font-medium bg-neon-cyan/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                    Folder
                                </span>
                            ) : (
                                <a
                                    href={app.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-1 mt-1 truncate"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    {app.url}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 min-h-[100px] text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {app.description || <span className="text-gray-600 italic">No description available.</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
