import { CloudSun, Thermometer } from 'lucide-react'

export function WeatherWidget() {
    return (
        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-white">Berlin</h3>
                    <p className="text-xs text-blue-200">Partly Cloudy</p>
                </div>
                <CloudSun className="w-8 h-8 text-yellow-400" />
            </div>

            <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">22°</span>
                <div className="flex items-center gap-1 text-xs text-blue-200 mb-1">
                    <Thermometer className="w-3 h-3" />
                    <span>H: 24° L: 16°</span>
                </div>
            </div>
        </div>
    )
}
