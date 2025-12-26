import { useState, useRef } from 'react'
import { X, Upload, Monitor, Palette, Sparkles } from 'lucide-react'
import { BackgroundConfig, IconConfig } from '../App'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    currentTitle: string
    onTitleChange: (newTitle: string) => void
    bgConfig: BackgroundConfig
    onBgChange: (config: BackgroundConfig) => void
    iconConfig: IconConfig
    onIconConfigChange: (config: IconConfig) => void
}

export function SettingsModal({
    isOpen,
    onClose,
    currentTitle,
    onTitleChange,
    bgConfig,
    onBgChange,
    iconConfig,
    onIconConfigChange
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'background' | 'effects'>('general')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            alert("File too large (max 10MB)")
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/v1/media/upload', { // Use relative path
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Upload failed')
            }

            const data = await res.json()
            // Backend returns relative URL like /uploads/filename.ext
            // We use it directly as relative URL

            onBgChange({
                type: data.type,
                value: data.url
            })
        } catch (err: any) {
            console.error(err)
            alert(`Upload failed: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md glass-panel rounded-2xl flex flex-col max-h-[90vh] relative animate-in fade-in zoom-in-95 duration-200">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 pb-2 border-b border-white/10">
                    <h2 className="text-xl font-bold text-neon-cyan">Settings</h2>
                    <div className="flex gap-4 mt-6 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'general' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('background')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'background' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Background
                        </button>
                        <button
                            onClick={() => setActiveTab('effects')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'effects' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Effects
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
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
                        </div>
                    )}

                    {activeTab === 'background' && (
                        <div className="space-y-6">
                            {/* Presets */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onBgChange({ type: 'image', value: 'gradient' })}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${bgConfig.value === 'gradient' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Monitor className="w-6 h-6" />
                                    <span className="text-xs font-medium">Default Gradient</span>
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Custom Media</h3>
                                <p className="text-xs text-gray-500">Supports Images (JPG, PNG, WebP) and Videos (MP4, WebM)</p>

                                {/* Unified URL Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400">Media URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={bgConfig.value.startsWith('http') ? bgConfig.value : ''}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                // Simple auto-detection
                                                const isVideo = /\.(mp4|webm|mov)$/i.test(val)
                                                onBgChange({
                                                    type: isVideo ? 'video' : 'image',
                                                    value: val
                                                })
                                            }}
                                            placeholder="https://example.com/media.jpg"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-neon-cyan outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-white/10"></span>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-[#1a1a1a] px-2 text-gray-500">Or upload</span>
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex justify-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,video/*"
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 hover:border-white/20 disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        <span className="text-sm">Upload File (Max 10MB)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'effects' && (
                        <div className="space-y-6">
                            {/* Border Effect */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-neon-cyan" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Neon Border</h3>
                                        <p className="text-xs text-gray-400">Add a glowing border to icons</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onIconConfigChange({ ...iconConfig, showBorder: !iconConfig.showBorder })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${iconConfig.showBorder ? 'bg-neon-cyan' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${iconConfig.showBorder ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-3 pt-2">
                                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    Background Style
                                </h3>

                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => onIconConfigChange({ ...iconConfig, backgroundStyle: 'glass' })}
                                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${iconConfig.backgroundStyle === 'glass' ? 'bg-neon-cyan/20 border-neon-cyan text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Glass (Default)
                                    </button>
                                    <button
                                        onClick={() => onIconConfigChange({ ...iconConfig, backgroundStyle: 'solid' })}
                                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${iconConfig.backgroundStyle === 'solid' ? 'bg-neon-cyan/20 border-neon-cyan text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Solid Color
                                    </button>
                                    <button
                                        onClick={() => onIconConfigChange({ ...iconConfig, backgroundStyle: 'gradient' })}
                                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${iconConfig.backgroundStyle === 'gradient' ? 'bg-neon-cyan/20 border-neon-cyan text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        Gradient
                                    </button>
                                </div>

                                {iconConfig.backgroundStyle === 'solid' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs text-gray-500">Pick Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={iconConfig.backgroundColor}
                                                onChange={(e) => onIconConfigChange({ ...iconConfig, backgroundColor: e.target.value })}
                                                className="h-8 w-16 rounded cursor-pointer bg-transparent border border-white/20"
                                            />
                                            <input
                                                type="text"
                                                value={iconConfig.backgroundColor}
                                                onChange={(e) => onIconConfigChange({ ...iconConfig, backgroundColor: e.target.value })}
                                                className="flex-1 bg-black/40 border border-white/10 rounded px-2 text-sm text-white focus:border-neon-cyan outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {iconConfig.backgroundStyle === 'gradient' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs text-gray-500">Pick Gradient Colors</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-600 block">Start</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={iconConfig.gradientColors[0]}
                                                        onChange={(e) => onIconConfigChange({ ...iconConfig, gradientColors: [e.target.value, iconConfig.gradientColors[1]] })}
                                                        className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-600 block">End</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={iconConfig.gradientColors[1]}
                                                        onChange={(e) => onIconConfigChange({ ...iconConfig, gradientColors: [iconConfig.gradientColors[0], e.target.value] })}
                                                        className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
