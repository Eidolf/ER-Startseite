import { CloudSun, Thermometer } from 'lucide-react'

interface WeatherWidgetProps {
    location?: string
    unit?: 'c' | 'f'
}

export function WeatherWidget({ location = 'Berlin', unit = 'c' }: WeatherWidgetProps) {
    const isCelsius = unit === 'c'
    const tempMain = isCelsius ? '22°C' : '72°F'
    const tempHighLow = isCelsius ? 'H: 24° L: 16°' : 'H: 75° L: 61°'

    return (
        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                    <h3 className="text-lg font-bold text-white truncate">{location || 'Berlin'}</h3>
                    <p className="text-xs text-blue-200">Partly Cloudy</p>
                </div>
                <CloudSun className="w-8 h-8 text-yellow-400 shrink-0" />
            </div>

            <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-bold text-white tracking-tight">{tempMain}</span>
                <div className="flex items-center gap-1 text-xs text-blue-200 mb-1">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>{tempHighLow}</span>
                </div>
            </div>
        </div>
    )
}
