import { useState, useEffect } from 'react'
import { X, Trash2, Settings, Hourglass, Save } from 'lucide-react'
import { WidgetData } from '../types'

interface WidgetContextModalProps {
    widget: WidgetData | null
    onClose: () => void
    onDelete: (id: string) => void
    onUpdateWidget?: (updated: WidgetData) => void
}

export function WidgetContextModal({ widget, onClose, onDelete, onUpdateWidget }: WidgetContextModalProps) {
    const [titleInput, setTitleInput] = useState('')
    const [dateInput, setDateInput] = useState('')

    useEffect(() => {
        if (widget) {
            setTitleInput(widget.vacationTitle || '')
            setDateInput(widget.vacationDate || '')
        }
    }, [widget])

    if (!widget) return null

    const handleSave = () => {
        if (!onUpdateWidget) {
            onClose()
            return
        }
        onUpdateWidget({
            ...widget,
            vacationTitle: titleInput.trim() || undefined,
            vacationDate: dateInput.trim() || undefined,
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel scale-95 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                        {widget.type === 'vacation' ? <Hourglass className="w-4 h-4 text-emerald-400" /> : <Settings className="w-4 h-4 text-neon-cyan" />}
                        <h3 className="font-medium text-white capitalize">{widget.type === 'vacation' ? 'Countdown Widget' : `${widget.type} Widget`}</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    {widget.type === 'vacation' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Countdown / Event Titel</label>
                                <input
                                    type="text"
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    placeholder="e.g. Geburtstag, Event oder Urlaub"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-neon-cyan"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Target Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={dateInput}
                                    onChange={(e) => setDateInput(e.target.value)}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-neon-cyan"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-600/30 mt-2"
                            >
                                <Save className="w-4 h-4" /> Save Configuration
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                <Settings className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-gray-400">
                                Configure or remove this <strong>{widget.type}</strong> widget.
                            </p>
                        </div>
                    )}

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
