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
    const [file, setFile] = useState<File | null>(null)
    const [jsonText, setJsonText] = useState('')
    const [briefText, setBriefText] = useState('')
    const [activeTab, setActiveTab] = useState<'file' | 'manual'>('file')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleClose = () => {
        setFile(null)
        setError('')
        setSuccessMessage('')
        setLoading(false)
        onClose()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setError('')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
            setError('')
        }
    }

    const handleUploadFile = async () => {
        if (!file) {
            setError('Please select a file (.json, .md, or .zip)')
            return
        }

        setLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            const formData = new FormData()
            formData.append('file', file)

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
            if (jsonText.trim()) {
                manifestObj = JSON.parse(jsonText)
            }

            const res = await fetch('/api/v1/monitoring/import/manifest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manifest: manifestObj,
                    brief_content: briefText.trim() || undefined,
                }),
            })

            if (!res.ok) {
                throw new Error('Failed to import JSON / Brief')
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
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
                    <button onClick={handleClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex rounded-lg bg-black/40 p-1 border border-white/10">
                    <button
                        onClick={() => setActiveTab('file')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'file' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                    >
                        Upload File (.json, .md, .zip)
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'manual' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                    >
                        Paste Manifest / Brief
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

                {/* File Upload Tab */}
                {activeTab === 'file' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-300">
                            Upload a <code className="text-neon-cyan font-mono">manifest.json</code>, <code className="text-neon-cyan font-mono">brief.md</code>, or a <code className="text-neon-cyan font-mono">manifest.zip</code> containing both. Widgets will be auto-generated.
                        </p>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-neon-cyan/30 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-neon-cyan/70 transition cursor-pointer bg-black/30"
                        >
                            <Sparkles className="w-8 h-8 text-neon-cyan animate-pulse" />
                            <span className="text-xs text-gray-300 font-medium cursor-pointer">
                                {file ? <span className="text-neon-cyan font-mono">{file.name}</span> : 'Click or Drag File Here'}
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                accept=".json,.md,.zip,.txt"
                                className="hidden"
                            />
                        </div>

                        <button
                            onClick={handleUploadFile}
                            disabled={loading || !file}
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
                            onClick={handleManualImport}
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
