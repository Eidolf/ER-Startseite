import { useState } from 'react'
import { Search, Settings, Grid, Plus } from 'lucide-react'

function App() {
    const [bgType, setBgType] = useState<'image' | 'video'>('image')
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <div className="min-h-screen relative overflow-hidden text-white font-sans">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                {bgType === 'video' ? (
                    <video autoPlay loop muted className="w-full h-full object-cover">
                        <source src="background.mp4" type="video/mp4" />
                    </video>
                ) : (
                    <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black" />
                )}
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col h-screen">

                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple neon-text">
                        NeonNexus
                    </h1>
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full glass-panel hover:bg-white/10 transition">
                            <Settings className="w-6 h-6 text-neon-cyan" />
                        </button>
                    </div>
                </header>

                {/* Search */}
                <div className="max-w-2xl mx-auto w-full mb-16 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-neon-cyan transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-4 rounded-xl glass-panel border-white/10 text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-transparent transition-all"
                        placeholder="Search the web or your apps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {/* Example App Tile */}
                        <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform cursor-pointer group hover:neon-glow border-white/5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Grid className="w-8 h-8 text-white" />
                            </div>
                            <span className="font-medium text-gray-200 group-hover:text-white">Dashboard</span>
                        </div>

                        {/* Add New Tile */}
                        <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-dashed border-2 border-white/20">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <Plus className="w-8 h-8 text-gray-400" />
                            </div>
                            <span className="font-medium text-gray-400">Add App</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default App
