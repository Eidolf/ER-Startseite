import React, { useRef, useState, useEffect } from 'react'
import { X, Upload, Trash2, Sparkles, Film, Palette, Monitor, ExternalLink, Github } from 'lucide-react'
import { BackgroundConfig, LogoConfig, IconConfig, TitleConfig } from '../App'

interface MediaItem {
    name: string
    url: string
    type: 'image' | 'video'
}

const getStrength = (pass: string) => {
    let score = 0
    if (pass.length > 7) score++
    if (pass.length > 11) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++
    return score
}

const getStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500'
    if (score < 4) return 'bg-yellow-500'
    return 'bg-green-500'
}

const getStrengthLabel = (score: number) => {
    if (score < 2) return 'Very Weak'
    if (score < 4) return 'Medium'
    return 'Strong'
}

function ChangePasswordForm() {
    const [oldPass, setOldPass] = useState('')
    const [newPass, setNewPass] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [loading, setLoading] = useState(false)

    const strength = getStrength(newPass)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPass !== confirmPass) return alert("Passwords do not match")
        if (newPass.length < 4) return alert("New password too short")

        setLoading(true)
        try {
            const res = await fetch('/api/v1/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: oldPass, new_password: newPass })
            })
            if (res.ok) {
                alert("Password changed successfully")
                setOldPass('')
                setNewPass('')
                setConfirmPass('')
            } else {
                alert("Failed to change password. Check old password.")
            }
        } catch (err) {
            alert("Error changing password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Current Password"
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-neon-cyan outline-none placeholder:text-gray-500"
            />

            <div className="space-y-1">
                <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="New Password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-neon-cyan outline-none placeholder:text-gray-500"
                />
                {newPass.length > 0 && (
                    <div className="flex items-center gap-2 px-1 pt-1">
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${getStrengthColor(strength)}`}
                                style={{ width: `${(strength / 5) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 min-w-[50px] text-right">
                            {getStrengthLabel(strength)}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-neon-cyan outline-none placeholder:text-gray-500"
                />
                {newPass !== confirmPass && confirmPass.length > 0 && (
                    <p className="text-red-400 text-[10px] animate-pulse px-1">Passwords do not match</p>
                )}
            </div>

            <button
                type="submit"
                disabled={loading || newPass !== confirmPass || newPass.length < 4}
                className="w-full py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    )
}

function MediaLibrary({ onSelect }: { onSelect: (url: string, type: string) => void }) {
    const [media, setMedia] = useState<MediaItem[]>([])
    const [loading, setLoading] = useState(true)

    const fetchMedia = async () => {
        try {
            const res = await fetch('/api/v1/media')
            if (res.ok) {
                const data = await res.json()
                setMedia(data)
            }
        } catch (e) {
            console.error("Failed to fetch media", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMedia()
    }, [])

    const handleDelete = async (e: React.MouseEvent, filename: string) => {
        e.stopPropagation()
        if (!confirm('Delete this file?')) return

        try {
            const res = await fetch(`/api/v1/media/${filename}`, { method: 'DELETE' })
            if (res.ok) {
                fetchMedia() // Refresh list
            }
        } catch (e) {
            console.error("Failed to delete", e)
        }
    }

    if (loading) return <div className="text-xs text-gray-500">Loading library...</div>
    if (media.length === 0) return <div className="text-xs text-gray-500 italic">No uploads yet.</div>

    return (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {media.map((item) => (
                <div
                    key={item.name}
                    onClick={() => onSelect(item.url, item.type)}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-neon-cyan transition-all"
                >
                    {item.type === 'video' ? (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <Film className="w-6 h-6 text-gray-500" />
                            <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted />
                        </div>
                    ) : (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            onClick={(e) => handleDelete(e, item.name)}
                            className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    currentTitle: string
    onTitleChange: (newTitle: string) => void
    bgConfig: BackgroundConfig
    onBgChange: (config: BackgroundConfig) => void
    logoConfig: LogoConfig
    onLogoChange: (config: LogoConfig) => void
    iconConfig: IconConfig
    onIconConfigChange: (config: IconConfig) => void
    titleConfig: TitleConfig
    onTitleConfigChange: (config: TitleConfig) => void
    openInNewTab: boolean
    onOpenInNewTabChange: (enabled: boolean) => void
}

export function SettingsModal({
    isOpen,
    onClose,
    currentTitle,
    onTitleChange,
    bgConfig,
    onBgChange,
    logoConfig,
    onLogoChange,
    iconConfig,
    onIconConfigChange,
    titleConfig,
    onTitleConfigChange,
    openInNewTab,
    onOpenInNewTabChange
}: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'background' | 'logo' | 'effects' | 'security' | 'about'>('general')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const logoFileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLogo = false) => {
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

            if (isLogo) {
                onLogoChange({
                    type: 'image',
                    value: `${data.url}?v=${Date.now()}`
                })
            } else {
                onBgChange({
                    type: data.type,
                    value: data.url
                })
            }
        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : 'Unknown error'
            alert(`Upload failed: ${message}`)
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
                            onClick={() => setActiveTab('logo')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'logo' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Logo
                        </button>
                        <button
                            onClick={() => setActiveTab('effects')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'effects' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Effects
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'security' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'about' ? 'text-white border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            About
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

                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="w-5 h-5 text-neon-cyan" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Open Apps in New Tab</h3>
                                        <p className="text-xs text-gray-400">Launch applications in a new browser tab</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenInNewTabChange(!openInNewTab)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${openInNewTab ? 'bg-neon-cyan' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${openInNewTab ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <label className="text-sm font-medium text-gray-400">Title Style</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => onTitleConfigChange({ ...titleConfig, style: 'default' })}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${titleConfig.style === 'default'
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Default
                                    </button>
                                    <button
                                        onClick={() => onTitleConfigChange({ ...titleConfig, style: 'solid', color: titleConfig.color || '#ffffff' })}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${titleConfig.style === 'solid'
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Solid
                                    </button>
                                    <button
                                        onClick={() => onTitleConfigChange({ ...titleConfig, style: 'gradient', gradientColors: titleConfig.gradientColors || ['#00f3ff', '#9d00ff'] })}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${titleConfig.style === 'gradient'
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        Gradient
                                    </button>
                                </div>

                                {titleConfig.style === 'solid' && (
                                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                                        <input
                                            type="color"
                                            value={titleConfig.color}
                                            onChange={(e) => onTitleConfigChange({ ...titleConfig, color: e.target.value })}
                                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-sm text-gray-400 font-mono">{titleConfig.color}</span>
                                    </div>
                                )}

                                {titleConfig.style === 'gradient' && (
                                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs text-gray-500">Start Color</span>
                                            <input
                                                type="color"
                                                value={titleConfig.gradientColors?.[0]}
                                                onChange={(e) => onTitleConfigChange({
                                                    ...titleConfig,
                                                    gradientColors: [e.target.value, titleConfig.gradientColors?.[1] || '#ffffff']
                                                })}
                                                className="w-full h-8 rounded cursor-pointer bg-transparent border-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs text-gray-500">End Color</span>
                                            <input
                                                type="color"
                                                value={titleConfig.gradientColors?.[1]}
                                                onChange={(e) => onTitleConfigChange({
                                                    ...titleConfig,
                                                    gradientColors: [titleConfig.gradientColors?.[0] || '#ffffff', e.target.value]
                                                })}
                                                className="w-full h-8 rounded cursor-pointer bg-transparent border-none"
                                            />
                                        </div>
                                    </div>
                                )}
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
                                <h3 className="text-sm font-medium text-gray-300">Media Library</h3>
                                <MediaLibrary
                                    onSelect={(url, type) => onBgChange({ type: type as 'image' | 'video', value: url })}
                                />
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
                                        onChange={(e) => handleFileUpload(e, false)}
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

                    {activeTab === 'logo' && (
                        <div className="space-y-6">
                            {/* Presets */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onLogoChange({ type: 'default', value: undefined })}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${logoConfig.type === 'default' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <Sparkles className="w-6 h-6" />
                                    <span className="text-xs font-medium">Default Animated</span>
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Media Library</h3>
                                <MediaLibrary
                                    onSelect={(url) => onLogoChange({ type: 'image', value: url })}
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <h3 className="text-sm font-medium text-gray-300">Custom Logo</h3>
                                <p className="text-xs text-gray-500">Supports Images (JPG, PNG, WebP, SVG)</p>

                                {/* URL Input */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400">Image URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={logoConfig.type === 'image' && logoConfig.value ? logoConfig.value : ''}
                                            onChange={(e) => onLogoChange({ type: 'image', value: e.target.value })}
                                            placeholder="https://example.com/logo.png"
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
                                        ref={logoFileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, true)}
                                    />
                                    <button
                                        onClick={() => logoFileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 hover:border-white/20 disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        <span className="text-sm">Upload Logo</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'effects' && (
                        <div className="space-y-6">
                            {/* Icon Border */}
                            <div className="rounded-xl border border-white/10 p-4 bg-black/40 space-y-4">
                                <div className="flex items-center justify-between">
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

                                {iconConfig.showBorder && (
                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex gap-2 p-1 rounded-lg bg-black/20">
                                            {(['default', 'solid', 'gradient'] as const).map((style) => (
                                                <button
                                                    key={style}
                                                    onClick={() => onIconConfigChange({ ...iconConfig, borderStyle: style })}
                                                    className={`flex-1 py-1.5 px-3 rounded text-xs transition-all capitalize ${iconConfig.borderStyle === style ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>

                                        {iconConfig.borderStyle === 'solid' && (
                                            <div className="flex items-center gap-3 animate-in fade-in">
                                                <input
                                                    type="color"
                                                    value={iconConfig.borderColor}
                                                    onChange={(e) => onIconConfigChange({ ...iconConfig, borderColor: e.target.value })}
                                                    className="h-8 w-12 rounded cursor-pointer bg-transparent border border-white/20"
                                                />
                                                <span className="text-xs text-gray-400">Border Color</span>
                                            </div>
                                        )}

                                        {iconConfig.borderStyle === 'gradient' && (
                                            <div className="space-y-2 animate-in fade-in">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] text-gray-600">Start Color</span>
                                                        <input
                                                            type="color"
                                                            value={iconConfig.borderGradientColors?.[0] || '#00f3ff'}
                                                            onChange={(e) => onIconConfigChange({ ...iconConfig, borderGradientColors: [e.target.value, iconConfig.borderGradientColors?.[1] || '#9d00ff'] })}
                                                            className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] text-gray-600">End Color</span>
                                                        <input
                                                            type="color"
                                                            value={iconConfig.borderGradientColors?.[1] || '#9d00ff'}
                                                            onChange={(e) => onIconConfigChange({ ...iconConfig, borderGradientColors: [iconConfig.borderGradientColors?.[0] || '#00f3ff', e.target.value] })}
                                                            className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Background Style */}
                            <div className="rounded-xl border border-white/10 p-4 bg-black/40 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Palette className="w-5 h-5 text-neon-purple" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Tile Background</h3>
                                        <p className="text-xs text-gray-400">Glass, Solid Color, or Gradient</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Style Toggle */}
                                    <div className="flex gap-2 p-1 rounded-lg bg-black/20">
                                        {(['glass', 'solid', 'gradient'] as const).map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => onIconConfigChange({ ...iconConfig, backgroundStyle: style })}
                                                className={`flex-1 py-1.5 px-3 rounded text-xs transition-all capitalize ${iconConfig.backgroundStyle === style ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Opacity Control (Only for Solid/Gradient) */}
                                    {iconConfig.backgroundStyle !== 'glass' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>Opacity</span>
                                                <span>{iconConfig.backgroundOpacity ?? 10}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={iconConfig.backgroundOpacity ?? 10}
                                                onChange={(e) => onIconConfigChange({ ...iconConfig, backgroundOpacity: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                                            />
                                        </div>
                                    )}

                                    {iconConfig.backgroundStyle === 'solid' && (
                                        <div className="flex items-center gap-3 animate-in fade-in">
                                            <input
                                                type="color"
                                                value={iconConfig.backgroundColor}
                                                onChange={(e) => onIconConfigChange({ ...iconConfig, backgroundColor: e.target.value })}
                                                className="h-8 w-12 rounded cursor-pointer bg-transparent border border-white/20"
                                            />
                                            <span className="text-xs text-gray-400">Background Color</span>
                                        </div>
                                    )}

                                    {iconConfig.backgroundStyle === 'gradient' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <div className="flex gap-2">
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-[10px] text-gray-600">Start Color</span>
                                                    <input
                                                        type="color"
                                                        value={iconConfig.gradientColors?.[0] || '#1a1a1a'}
                                                        onChange={(e) => onIconConfigChange({ ...iconConfig, gradientColors: [e.target.value, iconConfig.gradientColors?.[1] || '#000000'] })}
                                                        className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-[10px] text-gray-600">End Color</span>
                                                    <input
                                                        type="color"
                                                        value={iconConfig.gradientColors?.[1] || '#000000'}
                                                        onChange={(e) => onIconConfigChange({ ...iconConfig, gradientColors: [iconConfig.gradientColors?.[0] || '#1a1a1a', e.target.value] })}
                                                        className="h-8 w-full rounded cursor-pointer bg-transparent border border-white/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                    Change Password
                                </h3>
                                <ChangePasswordForm />
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-neon-cyan/20 rounded-full flex items-center justify-center mb-2">
                                    <Sparkles className="w-8 h-8 text-neon-cyan" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">ER-Startseite</h3>
                                    <p className="text-gray-400 text-sm">A modern, highly customizable dashboard.</p>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <a
                                        href="https://github.com/Eidolf/ER-Startseite"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-[#2b3137] hover:bg-[#24292e] text-white rounded-lg transition-colors border border-white/10"
                                    >
                                        <Github className="w-4 h-4" />
                                        <span>Source Code</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
