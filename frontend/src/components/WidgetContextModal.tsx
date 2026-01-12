import React from 'react'
import { X, Trash2, Settings } from 'lucide-react'
import { WidgetData } from '../types'

interface WidgetContextModalProps {
    widget: WidgetData | null
    onClose: () => void
    onDelete: (id: string) => void
}

export function WidgetContextModal({ widget, onClose, onDelete }: WidgetContextModalProps) {
    if (!widget) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel scale-95 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-neon-cyan" />
                        <h3 className="font-medium text-white capitalize">{widget.type} Widget</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                            <Settings className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-gray-400">
                            Configure or remove this <strong>{widget.type}</strong> widget.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            if (confirm("Remove this widget?")) {
                                onDelete(widget.id)
                                onClose()
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-medium group"
                    >
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Remove Widget
                    </button>
                </div>
            </div>
        </div>
    )
}
