import React, { useState, useRef } from 'react'
import { FileUp, X, Sparkles, Check, AlertCircle } from 'lucide-react'

interface ImportModalProps {
    isOpen: boolean
    onClose: () => void
    onImportSuccess: () => void
}

export const ImportModal: React.FC<ImportModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess,
}) => {
    const [shareUrl, setShareUrl] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [jsonText, setJsonText] = useState('')
    const [briefText, setBriefText] = useState('')
    const [activeTab, setActiveTab] = useState<'url' | 'file' | 'manual'>('url')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleClose = () => {
        setShareUrl('')
        setFiles([])
        setError('')
        setSuccessMessage('')
        setLoading(false)
        onClose()
    }

    const handleUrlImport = async () => {
        if (!shareUrl.trim()) {
            setError('Please enter a valid Varco Share URL')
            return
        }

        setLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            const res = await fetch('/api/v1/monitoring/import/url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ share_url: shareUrl.trim() }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || 'Failed to fetch Varco Share URL')
            }

            setSuccessMessage('Successfully imported Varco Share Link & generated telemetry cards!')
            setTimeout(() => {
                onImportSuccess()
                handleClose()
            }, 1000)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'URL import failed'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files))
            setError('')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files))
            setError('')
        }
    }

    const handleUploadFile = async () => {
        if (files.length === 0) {
            setError('Please select one or more files (.json, .md, or .zip)')
            return
        }

        setLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            const formData = new FormData()
            files.forEach((f) => {
                formData.append('files', f)
            })

            const res = await fetch('/api/v1/monitoring/import/file', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || 'Import failed')
            }

            setSuccessMessage('Successfully imported monitoring configuration!')
            setTimeout(() => {
                onImportSuccess()
                handleClose()
            }, 1000)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Import failed'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleManualImport = async () => {
        setLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            let manifestObj: Record<string, unknown> | null = null
            let combinedBrief = briefText.trim()

            if (jsonText.trim()) {
                try {
                    manifestObj = JSON.parse(jsonText)
                } catch {
                    // If not valid JSON object, treat jsonText as brief/text content
                    combinedBrief = combinedBrief ? `${jsonText.trim()}\n\n${combinedBrief}` : jsonText.trim()
                }
            }

            const res = await fetch('/api/v1/monitoring/import/manifest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manifest: manifestObj,
                    brief_content: combinedBrief || undefined,
                }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || 'Failed to import JSON / Brief')
            }

            setSuccessMessage('Successfully imported payload!')
            setTimeout(() => {
                onImportSuccess()
                handleClose()
            }, 1000)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Invalid JSON or Brief data'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            onClick={(e) => {
                e.stopPropagation()
                handleClose()
            }}
            className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg glass-panel rounded-2xl border border-neon-cyan/40 shadow-2xl p-6 relative flex flex-col gap-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 text-neon-cyan">
                        <FileUp className="w-5 h-5" />
                        <h3 className="text-lg font-bold text-white tracking-wide">Import Varco / Monitoring Source</h3>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleClose()
                        }}
                        className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex rounded-lg bg-black/40 p-1 border border-white/10 gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setActiveTab('url')
                        }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'url' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                    >
                        Varco Share Link
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setActiveTab('file')
                        }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'file' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                    >
                        Upload File (.json, .zip)
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setActiveTab('manual')
                        }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'manual' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                    >
                        Paste Manifest
                    </button>
                </div>

                {/* Error / Success Banners */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* URL Share Link Tab */}
                {activeTab === 'url' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-300">
                            Paste your <code className="text-neon-cyan font-mono">Varco Share Link</code> (e.g. <span className="text-gray-400 font-mono">https://varco-bridge.andreabaccega.com/share/...</span>).
                        </p>

                        <div>
                            <label className="block text-[11px] text-neon-cyan font-mono mb-1">Varco Share URL</label>
                            <input
                                type="url"
                                value={shareUrl}
                                onChange={(e) => setShareUrl(e.target.value)}
                                placeholder="https://varco-bridge.andreabaccega.com/share/..."
                                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-neon-cyan"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleUrlImport()
                            }}
                            disabled={loading || !shareUrl.trim()}
                            className="w-full py-2.5 rounded-xl bg-neon-cyan hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
                        >
                            {loading ? 'Fetching Varco Share...' : 'Import Varco Share Link'}
                        </button>
                    </div>
                )}

                {/* File Upload Tab */}
                {activeTab === 'file' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-300">
                            Upload a <code className="text-neon-cyan font-mono">manifest.json</code>, <code className="text-neon-cyan font-mono">brief.md</code>, or a <code className="text-neon-cyan font-mono">manifest.zip</code> containing both. Widgets will be auto-generated.
                        </p>

                        <div
                            onClick={(e) => {
                                e.stopPropagation()
                                fileInputRef.current?.click()
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-neon-cyan/30 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-neon-cyan/70 transition cursor-pointer bg-black/30"
                        >
                            <Sparkles className="w-8 h-8 text-neon-cyan animate-pulse" />
                            <span className="text-xs text-gray-300 font-medium cursor-pointer text-center truncate max-w-full px-2">
                                {files.length > 0 ? (
                                    <span className="text-neon-cyan font-mono font-bold">
                                        {files.map((f) => f.name).join(', ')}
                                    </span>
                                ) : (
                                    'Click or Drag Files Here (.json, .md, .zip)'
                                )}
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                accept=".json,.md,.zip,.txt"
                                className="hidden"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleUploadFile()
                            }}
                            disabled={loading || files.length === 0}
                            className="w-full py-2.5 rounded-xl bg-neon-cyan hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
                        >
                            {loading ? 'Processing Import...' : 'Import & Generate Widgets'}
                        </button>
                    </div>
                )}

                {/* Manual Text Tab */}
                {activeTab === 'manual' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[11px] text-neon-cyan font-mono mb-1">manifest.json Content</label>
                            <textarea
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                                placeholder='{"entities": ["sensor.speedtest_download", "sensor.speedtest_upload", "sensor.speedtest_ping"]}'
                                className="w-full h-24 bg-black/60 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-neon-cyan"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-neon-cyan font-mono mb-1">brief.md Content (Optional)</label>
                            <textarea
                                value={briefText}
                                onChange={(e) => setBriefText(e.target.value)}
                                placeholder="Dashboard ER-Netz Status / Netzwerk&#10;- `sensor.speedtest_download`"
                                className="w-full h-20 bg-black/60 border border-white/10 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-neon-cyan"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleManualImport()
                            }}
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl bg-neon-cyan hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
                        >
                            {loading ? 'Importing...' : 'Parse & Save Configuration'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
