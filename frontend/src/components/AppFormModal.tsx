import React, { useState, useEffect } from 'react'
import { X, Trash, ArrowUpFromLine, Upload, RefreshCw, Check, Film, Tv, Lock, Disc, Calendar } from 'lucide-react'
import { AppData, Category, PremiumAppConfig } from '../types'
import { AppIcon } from './AppIcon'

interface AppFormModalProps {
    isOpen: boolean
    onClose: () => void
    onComplete: (isHidden?: boolean, appId?: string, newApp?: AppData, categoryId?: string) => void
    editApp: AppData | null
    categories?: Category[]
}

export function AppFormModal({ isOpen, onClose, onComplete, editApp, categories }: AppFormModalProps) {
    const [activeTab, setActiveTab] = useState<'custom' | 'store' | 'folder'>('custom')
    const [categoryId, setCategoryId] = useState<string>('')
    const [premiumApps, setPremiumApps] = useState<AppData[]>([])
    const [selectedPremiumApp, setSelectedPremiumApp] = useState<AppData | null>(null)

    // Form State
    const [name, setName] = useState('')
    const [url, setUrl] = useState('')
    const [description, setDescription] = useState('')
    const [customIconUrl, setCustomIconUrl] = useState('')
    const [hideApp, setHideApp] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingIcon, setUploadingIcon] = useState(false)

    // Integration State
    const [integration, setIntegration] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [apiUrl, setApiUrl] = useState('')
    const [apiProtected, setApiProtected] = useState(false)
    const [apiConfig, setApiConfig] = useState<PremiumAppConfig>({})

    // App Store Search & Sort State
    const [storeSearchQuery, setStoreSearchQuery] = useState('')
    const [storeSortOrder, setStoreSortOrder] = useState<'default' | 'alpha'>('default')

    useEffect(() => {
        if (editApp) {
            setName(editApp.name)
            setUrl(editApp.url || '')
            setDescription(editApp.description || '')
            setCustomIconUrl(editApp.custom_icon_url || '')
            setActiveTab(editApp.type === 'folder' ? 'folder' : 'custom')

            // Find current category
            if (categories) {
                const currentCat = categories.find(c => c.app_ids.includes(editApp.id))
                setCategoryId(currentCat ? currentCat.id : '')
            }

            // Integration
            setIntegration(editApp.integration || '')
            setApiKey(editApp.api_key || '')
            setApiUrl(editApp.api_url || '')
            setApiProtected(editApp.api_protected || false)
            setApiConfig(editApp.api_config || {})
        } else if (isOpen) {
            // Reset
            setName('')
            setUrl('')
            setDescription('')
            setCustomIconUrl('')
            setHideApp(false)
            setActiveTab('custom')
            setSelectedPremiumApp(null)
            setCategoryId('')
            setIntegration('')
            setApiKey('')
            setApiUrl('')
            setApiProtected(false)
            setApiConfig({})
        }
    }, [isOpen, editApp, categories])

    useEffect(() => {
        if (isOpen && activeTab === 'store' && !editApp) {
            fetch('/api/v1/apps/premium')
                .then(res => res.json())
                .then(data => setPremiumApps(data))
                .catch(e => console.error("Failed to load premium apps", e))
        }
    }, [isOpen, activeTab, editApp])

    const handleSelectPremium = (app: AppData) => {
        setSelectedPremiumApp(app)
        setName(app.name)
        setUrl('')
        setDescription(app.description || '')

        // Auto-select integration
        if (app.id === 'ombi') setIntegration('ombi')
        else if (app.id === 'lidarr') setIntegration('lidarr')
        else setIntegration('')
    }


    const handleRefreshMetadata = async () => {
        if (!url) return
        setLoading(true)
        let targetUrl = url
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl
        }

        try {
            const res = await fetch('/api/v1/apps/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl })
            })
            if (res.ok) {
                const data = await res.json()
                if (data.description) setDescription(data.description)
                if (data.icon) setCustomIconUrl(data.icon)
                if (data.title && !name) setName(data.title) // Auto-fill name if empty
            }
        } catch (error) {
            console.error('Preview failed', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingIcon(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/v1/media/upload', {
                method: 'POST',
                body: formData
            })
            if (res.ok) {
                const data = await res.json()
                setCustomIconUrl(data.url)
            } else {
                alert('Failed to upload image')
            }
        } catch (error) {
            console.error('Upload failed', error)
            alert('Upload failed')
        } finally {
            setUploadingIcon(false)
        }
    }

    const [urlError, setUrlError] = useState('')

    const validateUrl = (str: string) => {
        if (!str) return false
        // Allow localhost, IPs, and domains with at least one dot
        const pattern = /^(https?:\/\/)?((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/
        return pattern.test(str)
    }

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        let finalUrl = url
        // Validate URL only for links
        if (activeTab !== 'folder') {
            if (!validateUrl(finalUrl)) {
                setUrlError('Please enter a valid URL (e.g., example.com, localhost, or 192.168.x.x)')
                setLoading(false)
                return
            }
            if (!/^https?:\/\//i.test(finalUrl)) {
                finalUrl = 'https://' + finalUrl
            }
        }

        try {
            const body: {
                name: string;
                type: 'folder' | 'link';
                url?: string;
                premium_id?: string;
                contents?: AppData[];
                description?: string;
                custom_icon_url?: string;
                integration?: string;
                api_key?: string;
                api_url?: string;
                api_protected?: boolean;
                api_config?: PremiumAppConfig;
            } = {
                name,
                type: activeTab === 'folder' ? 'folder' : 'link',
                description,
                custom_icon_url: customIconUrl,
                integration: integration || undefined,
                api_key: apiKey.trim() || undefined,
                api_url: apiUrl.trim() || undefined,
                api_protected: apiProtected,
                api_config: apiConfig
            }

            if (activeTab !== 'folder') {
                body.url = finalUrl
                if (activeTab === 'store' && selectedPremiumApp) {
                    body.premium_id = selectedPremiumApp.id
                }
            } else {
                body.contents = []
            }

            let res;
            if (editApp) {
                // UPDATE
                res = await fetch(`/api/v1/apps/${editApp.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
            } else {
                // CREATE
                res = await fetch('/api/v1/apps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
            }

            if (res.ok) {
                const newApp = await res.json()
                onComplete(hideApp, newApp.id, newApp, categoryId)
                onClose()
                // Reset form
                setName('')
                setUrl('')
                setDescription('')
                setCustomIconUrl('')
                setHideApp(false)
                setSelectedPremiumApp(null)
                setActiveTab('custom')
                setCategoryId('')
                setIntegration('')
                setApiKey('')
                setApiUrl('')
                setApiProtected(false)
                setApiConfig({})
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Failed to add app: ${res.status} ${errData.detail || errData.message || 'Unknown error'}`);
                console.error("Add app failed", res.status, errData);
            }
        } catch (e) {
            console.error("Failed to add app", e)
            const msg = e instanceof Error ? e.message : String(e);
            alert(`Error adding app: ${msg}`);
        } finally {
            setLoading(false)
        }
    }

    // Filter and Sort Premium Apps
    const filteredStoreApps = premiumApps
        .filter(app =>
            app.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
            (app.description || '').toLowerCase().includes(storeSearchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (storeSortOrder === 'alpha') {
                return a.name.localeCompare(b.name)
            }
            return 0 // Keep default order
        })

    // Determine what form content to show
    const renderFormContent = () => {
        if (activeTab === 'store' && !selectedPremiumApp) {
            // Store Grid
            return (
                <div className="space-y-4">
                    {/* Store Search & Sort Controls */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <ArrowUpFromLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 rotate-90" /> {/* Using ArrowUpFromLine as search icon replacement temporarily if Search is missing, but Lucide usually has Search */}
                            <input
                                type="text"
                                placeholder="Search apps..."
                                value={storeSearchQuery}
                                onChange={(e) => setStoreSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-neon-cyan transition-colors"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setStoreSortOrder(prev => prev === 'default' ? 'alpha' : 'default')}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${storeSortOrder === 'alpha'
                                ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                            title={storeSortOrder === 'alpha' ? "Sorting Alphabetically" : "Default Sorting"}
                        >
                            <ArrowUpFromLine className={`w-4 h-4 transition-transform ${storeSortOrder === 'alpha' ? '' : 'rotate-180'}`} />
                            {storeSortOrder === 'alpha' ? 'A-Z' : 'Default'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                        {filteredStoreApps.map(app => (
                            <div
                                key={app.id}
                                onClick={() => handleSelectPremium(app)}
                                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-neon-cyan/50 rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all group"
                            >
                                <div className="w-12 h-12 bg-black/20 rounded-lg p-2 group-hover:scale-110 transition-transform">
                                    <AppIcon src={app.default_icon} alt={app.name} className="w-full h-full object-contain" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-medium text-white text-sm">{app.name}</h3>
                                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{app.description}</p>
                                </div>
                            </div>
                        ))}
                        {filteredStoreApps.length === 0 && (
                            <div className="col-span-2 py-8 text-center text-gray-500 text-sm italic">
                                No apps found matching "{storeSearchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        const isAutoIntegration = selectedPremiumApp && (selectedPremiumApp.id === 'ombi' || selectedPremiumApp.id === 'lidarr');


        return (
            <div className="space-y-4">
                {selectedPremiumApp && (
                    <div className="flex items-center gap-3 bg-neon-cyan/10 border border-neon-cyan/20 p-3 rounded-lg mb-4">
                        <div className="w-10 h-10 bg-black/20 rounded-lg p-1.5 shrink-0">
                            <AppIcon src={selectedPremiumApp.default_icon} alt={selectedPremiumApp.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-neon-cyan">Configuring {selectedPremiumApp.name}</h4>
                            <button type="button" onClick={() => setSelectedPremiumApp(null)} className="text-xs text-gray-400 hover:text-white underline">Back to Store</button>
                        </div>
                    </div>
                )}

                {/* Category Selection */}
                {categories && categories.length > 0 && activeTab !== 'folder' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Category</label>
                        <div className="relative">
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-cyan transition-colors appearance-none cursor-pointer"
                            >
                                <option value="">Uncategorized</option>
                                <option value={categoryId || ''}>{categories.find(c => c.id === categoryId)?.name || "Select Category"}</option>
                                {categories.filter(c => c.id !== categoryId).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ArrowUpFromLine className="w-4 h-4 text-gray-400 rotate-180" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-cyan transition-colors"
                        placeholder={activeTab === 'folder' ? "Folder Name" : "App Name"}
                    />
                </div>

                {activeTab !== 'folder' && (
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value)
                                    if (urlError) setUrlError('')
                                }}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                                placeholder="https://example.com"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleRefreshMetadata}
                                disabled={loading || !url}
                                className="px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                                title="Auto-fetch Description & Icon"
                            >
                                <RefreshCw className={`w-5 h-5 text-neon-cyan ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        {urlError && <p className="text-xs text-red-400 ml-1">{urlError}</p>}
                    </div>
                )
                }

                {
                    activeTab !== 'folder' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Custom Logo (Optional)</label>
                                <div className="flex items-center gap-4">
                                    {customIconUrl && (
                                        <div className="w-10 h-10 bg-black/40 rounded-lg p-1 shrink-0 border border-white/10">
                                            <AppIcon src={customIconUrl} alt="Preview" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingIcon} />
                                        <div className={`flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-neon-cyan/50 rounded-lg py-2 transition-colors ${uploadingIcon ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <Upload className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-400">{uploadingIcon ? 'Uploading...' : 'Upload Image'}</span>
                                        </div>
                                    </label>
                                    {customIconUrl && (
                                        <button type="button" onClick={() => setCustomIconUrl('')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-cyan transition-colors text-sm resize-none custom-scrollbar"
                                    rows={3}
                                    placeholder="Short description..."
                                />
                            </div>
                        </div>
                    )
                }

                {/* Integration / Premium Settings */}
                {
                    activeTab !== 'folder' && (
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            {/* Hide selection if auto-determined */}
                            {!isAutoIntegration && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Integration (Optional)</label>
                                    <select
                                        value={integration}
                                        onChange={(e) => setIntegration(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-cyan transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="">None</option>
                                        <option value="lidarr">Lidarr</option>
                                    </select>
                                </div>
                            )}

                            {isAutoIntegration && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">API Connection (Optional)</label>
                                    <div className="text-xs text-gray-500">
                                        Configuring {integration === 'lidarr' ? 'Lidarr' : 'Ombi'} integration.
                                    </div>
                                </div>
                            )}

                            {integration === 'ombi' && (
                                <div className="space-y-3 p-3 bg-neon-cyan/5 border border-neon-cyan/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider">API URL (Optional)</label>
                                        <input
                                            type="text"
                                            value={apiUrl}
                                            onChange={(e) => setApiUrl(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                                            placeholder="https://ombi.example.com (Leave empty to use App URL)"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider">API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                                            placeholder="Ombi API Key"
                                        />
                                    </div>

                                    {/* Feature Toggles */}
                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Features</label>
                                            <span className="text-[10px] text-gray-500">Visible / Protected</span>
                                        </div>

                                        {/* Movies */}
                                        <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                            <span className="text-sm text-white flex items-center gap-2">
                                                <Film className="w-4 h-4 text-purple-400" />
                                                Movies
                                            </span>
                                            <div className="flex gap-2">
                                                {/* Visibility Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.movies || { enabled: true, protected: false };
                                                        return { ...prev, movies: { ...current, enabled: !current.enabled } };
                                                    })}
                                                    className={`px-2 py-1.5 rounded text-xs transition-colors border ${(apiConfig.movies?.enabled ?? true) ? 'bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                                                    title={(apiConfig.movies?.enabled ?? true) ? "Visible on card" : "Hidden from card"}
                                                >
                                                    {(apiConfig.movies?.enabled ?? true) ? 'Show' : 'Hide'}
                                                </button>

                                                {/* Protection Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.movies || { enabled: true, protected: false };
                                                        return { ...prev, movies: { ...current, protected: !current.protected } };
                                                    })}
                                                    disabled={!(apiConfig.movies?.enabled ?? true)}
                                                    className={`p-1.5 rounded border transition-colors ${(apiConfig.movies?.protected ?? false) ? 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                                    title={(apiConfig.movies?.protected ?? false) ? "Requires Admin PIN" : "Publicly Visible"}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* TV */}
                                        <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                            <span className="text-sm text-white flex items-center gap-2">
                                                <Tv className="w-4 h-4 text-blue-400" />
                                                TV Series
                                            </span>
                                            <div className="flex gap-2">
                                                {/* Visibility Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.tv || { enabled: true, protected: false };
                                                        return { ...prev, tv: { ...current, enabled: !current.enabled } };
                                                    })}
                                                    className={`px-2 py-1.5 rounded text-xs transition-colors border ${(apiConfig.tv?.enabled ?? true) ? 'bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                                                >
                                                    {(apiConfig.tv?.enabled ?? true) ? 'Show' : 'Hide'}
                                                </button>

                                                {/* Protection Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.tv || { enabled: true, protected: false };
                                                        return { ...prev, tv: { ...current, protected: !current.protected } };
                                                    })}
                                                    disabled={!(apiConfig.tv?.enabled ?? true)}
                                                    className={`p-1.5 rounded border transition-colors ${(apiConfig.tv?.protected ?? false) ? 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                                    title={(apiConfig.tv?.protected ?? false) ? "Requires Admin PIN" : "Publicly Visible"}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => setApiProtected(!apiProtected)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${apiProtected ? 'bg-neon-cyan border-neon-cyan text-black' : 'border-gray-500 text-transparent'}`}
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs text-gray-400 cursor-pointer" onClick={() => setApiProtected(!apiProtected)}>
                                            Hide All behind Admin PIN
                                        </span>
                                    </div>
                                </div>
                            )}

                            {integration === 'lidarr' && (
                                <div className="space-y-3 p-3 bg-neon-cyan/5 border border-neon-cyan/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Lidarr API URL (Optional)</label>
                                        <input
                                            type="text"
                                            value={apiUrl}
                                            onChange={(e) => setApiUrl(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                                            placeholder="http://localhost:8686 (Leave empty to use App URL)"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-neon-cyan uppercase tracking-wider">API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                                            placeholder="Lidarr API Key"
                                        />
                                    </div>

                                    {/* Feature Toggles */}
                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Features</label>
                                            <span className="text-[10px] text-gray-500">Visible / Protected</span>
                                        </div>

                                        {/* Library Stats */}
                                        <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                            <span className="text-sm text-white flex items-center gap-2">
                                                <Disc className="w-4 h-4 text-neon-purple" />
                                                Library Stats
                                            </span>
                                            <div className="flex gap-2">
                                                {/* Visibility Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.stats || { enabled: true, protected: false };
                                                        return { ...prev, stats: { ...current, enabled: !current.enabled } };
                                                    })}
                                                    className={`px-2 py-1.5 rounded text-xs transition-colors border ${(apiConfig.stats?.enabled ?? true) ? 'bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                                                >
                                                    {(apiConfig.stats?.enabled ?? true) ? 'Show' : 'Hide'}
                                                </button>

                                                {/* Protection Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.stats || { enabled: true, protected: false };
                                                        return { ...prev, stats: { ...current, protected: !current.protected } };
                                                    })}
                                                    disabled={!(apiConfig.stats?.enabled ?? true)}
                                                    className={`p-1.5 rounded border transition-colors ${(apiConfig.stats?.protected ?? false) ? 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                                    title={(apiConfig.stats?.protected ?? false) ? "Requires Admin PIN" : "Publicly Visible"}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Queue Stats */}
                                        <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                            <span className="text-sm text-white flex items-center gap-2">
                                                <ArrowUpFromLine className="w-4 h-4 text-orange-400" />
                                                Queue
                                            </span>
                                            <div className="flex gap-2">
                                                {/* Visibility Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.queue || { enabled: true, protected: false };
                                                        return { ...prev, queue: { ...current, enabled: !current.enabled } };
                                                    })}
                                                    className={`px-2 py-1.5 rounded text-xs transition-colors border ${(apiConfig.queue?.enabled ?? true) ? 'bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                                                >
                                                    {(apiConfig.queue?.enabled ?? true) ? 'Show' : 'Hide'}
                                                </button>

                                                {/* Protection Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.queue || { enabled: true, protected: false };
                                                        return { ...prev, queue: { ...current, protected: !current.protected } };
                                                    })}
                                                    disabled={!(apiConfig.queue?.enabled ?? true)}
                                                    className={`p-1.5 rounded border transition-colors ${(apiConfig.queue?.protected ?? false) ? 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                                    title={(apiConfig.queue?.protected ?? false) ? "Requires Admin PIN" : "Publicly Visible"}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Calendar */}
                                        <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                            <span className="text-sm text-white flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                Calendar
                                            </span>
                                            <div className="flex gap-2">
                                                {/* Visibility Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.calendar || { enabled: true, protected: false };
                                                        return { ...prev, calendar: { ...current, enabled: !current.enabled } };
                                                    })}
                                                    className={`px-2 py-1.5 rounded text-xs transition-colors border ${(apiConfig.calendar?.enabled ?? true) ? 'bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}
                                                >
                                                    {(apiConfig.calendar?.enabled ?? true) ? 'Show' : 'Hide'}
                                                </button>

                                                {/* Protection Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => setApiConfig(prev => {
                                                        const current = prev.calendar || { enabled: true, protected: false };
                                                        return { ...prev, calendar: { ...current, protected: !current.protected } };
                                                    })}
                                                    disabled={!(apiConfig.calendar?.enabled ?? true)}
                                                    className={`p-1.5 rounded border transition-colors ${(apiConfig.calendar?.protected ?? false) ? 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'} disabled:opacity-30 disabled:cursor-not-allowed`}
                                                    title={(apiConfig.calendar?.protected ?? false) ? "Requires Admin PIN" : "Publicly Visible"}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => setApiProtected(!apiProtected)}
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${apiProtected ? 'bg-neon-cyan border-neon-cyan text-black' : 'border-gray-500 text-transparent'}`}
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <span className="text-xs text-gray-400 cursor-pointer" onClick={() => setApiProtected(!apiProtected)}>
                                                Hide All behind Admin PIN
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }


                <div className="flex items-center gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setHideApp(!hideApp)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hideApp ? 'bg-neon-cyan border-neon-cyan text-black' : 'border-gray-500 text-transparent'}`}
                    >
                        <Check className="w-3 h-3" />
                    </button>
                    <span className="text-sm text-gray-400" onClick={() => setHideApp(!hideApp)}>Initially Hidden (can be changed in Layout)</span>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading ? (editApp ? "Updating..." : "Adding...") : (editApp ? "Save Changes" : "Add App")}
                </button>

            </div >
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-panel flex flex-col max-h-[90vh]">
                <div className="flex flex-col border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-center px-6 py-4">
                        {editApp ? (
                            <h2 className="text-lg font-semibold text-white">Edit Item</h2>
                        ) : (
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setActiveTab('custom')}
                                    className={`text-sm font-medium transition-colors ${activeTab === 'custom' ? 'text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Custom App
                                </button>
                                <button
                                    onClick={() => setActiveTab('store')}
                                    className={`text-sm font-medium transition-colors ${activeTab === 'store' ? 'text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                                >
                                    App Store
                                </button>
                                <button
                                    onClick={() => setActiveTab('folder')}
                                    className={`text-sm font-medium transition-colors ${activeTab === 'folder' ? 'text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Create Folder
                                </button>
                            </div>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {renderFormContent()}
                </form>
            </div>
        </div>
    )
}
