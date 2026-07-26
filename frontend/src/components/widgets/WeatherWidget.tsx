import { useState, useEffect } from 'react'
import { CloudSun, CloudRain, Sun, CloudFog, Snowflake, CloudLightning, Cloud, Loader2 } from 'lucide-react'

interface WeatherWidgetProps {
    location?: string
    unit?: 'c' | 'f'
}

interface WeatherData {
    city: string
    temp: string
    description: string
    weatherCode: number
    humidity: number
    windSpeed: string
}

function getWeatherIcon(code: number) {
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-400 shrink-0 animate-pulse" />
    if ([1, 2, 3].includes(code)) return <CloudSun className="w-8 h-8 text-yellow-400 shrink-0" />
    if ([45, 48].includes(code)) return <CloudFog className="w-8 h-8 text-gray-400 shrink-0" />
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="w-8 h-8 text-blue-400 shrink-0" />
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <Snowflake className="w-8 h-8 text-cyan-200 shrink-0" />
    if ([95, 96, 99].includes(code)) return <CloudLightning className="w-8 h-8 text-purple-400 shrink-0" />
    return <Cloud className="w-8 h-8 text-gray-300 shrink-0" />
}

function getWeatherDescription(code: number): string {
    if (code === 0) return 'Clear Sky'
    if (code === 1) return 'Mainly Clear'
    if (code === 2) return 'Partly Cloudy'
    if (code === 3) return 'Overcast'
    if ([45, 48].includes(code)) return 'Foggy'
    if ([51, 53, 55].includes(code)) return 'Drizzle'
    if ([61, 63, 65].includes(code)) return 'Rainy'
    if ([71, 73, 75].includes(code)) return 'Snowy'
    if ([80, 81, 82].includes(code)) return 'Rain Showers'
    if ([95, 96, 99].includes(code)) return 'Thunderstorm'
    return 'Cloudy'
}

export function WeatherWidget({ location = 'Berlin', unit = 'c' }: WeatherWidgetProps) {
    const [data, setData] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const queryCity = location.trim() || 'Berlin'
        let activeController: AbortController | null = null

        const fetchWeather = async () => {
            if (activeController) activeController.abort()
            const controller = new AbortController()
            activeController = controller

            const timeoutId = setTimeout(() => controller.abort(), 10000)

            setLoading(true)
            setError('')
            try {
                // Step 1: Geocoding via Open-Meteo Geocoding API
                const geoRes = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=1&language=en&format=json`,
                    { signal: controller.signal }
                )
                if (!geoRes.ok) throw new Error('Geocoding failed')
                const geoData = await geoRes.json()
                if (!geoData.results || geoData.results.length === 0) {
                    throw new Error(`Location "${queryCity}" not found`)
                }
                const result = geoData.results[0]
                const lat = result.latitude
                const lon = result.longitude
                const cityName = result.name

                // Step 2: Weather Forecast via Open-Meteo Weather API
                const tempUnitParam = unit === 'f' ? '&temperature_unit=fahrenheit' : ''
                const windUnitParam = unit === 'f' ? '&wind_speed_unit=mph' : ''
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m${tempUnitParam}${windUnitParam}&timezone=auto`,
                    { signal: controller.signal }
                )
                if (!weatherRes.ok) throw new Error('Weather fetch failed')
                const weatherData = await weatherRes.json()
                const current = weatherData.current

                const tempFormatted = `${Math.round(current.temperature_2m)}°${unit.toUpperCase()}`
                const windSpeedFormatted = `${Math.round(current.wind_speed_10m)} ${unit === 'f' ? 'mph' : 'km/h'}`

                setData({
                    city: cityName,
                    temp: tempFormatted,
                    description: getWeatherDescription(current.weather_code),
                    weatherCode: current.weather_code,
                    humidity: current.relative_humidity_2m,
                    windSpeed: windSpeedFormatted,
                })
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'Weather error')
            } finally {
                clearTimeout(timeoutId)
                if (!controller.signal.aborted) setLoading(false)
            }
        }

        fetchWeather()
        const interval = setInterval(fetchWeather, 600000) // Poll every 10 minutes
        return () => {
            if (activeController) activeController.abort()
            clearInterval(interval)
        }
    }, [location, unit])

    if (loading && !data) {
        return (
            <div className="w-full h-full p-4 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-white/10 backdrop-blur-md">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-white/10 backdrop-blur-md">
                <CloudSun className="w-6 h-6 text-yellow-400 mb-1" />
                <span className="text-xs font-semibold text-white truncate max-w-full">{location}</span>
                <span className="text-[10px] text-red-300 truncate max-w-full mt-0.5">{error || 'Failed'}</span>
            </div>
        )
    }

    return (
        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                    <h3 className="text-lg font-bold text-white truncate">{data.city}</h3>
                    <p className="text-xs text-blue-200">{data.description}</p>
                </div>
                {getWeatherIcon(data.weatherCode)}
            </div>

            <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-white tracking-tight">{data.temp}</span>
                <div className="text-[10px] text-blue-200 text-right">
                    <div>Wind: {data.windSpeed}</div>
                    <div>Humidity: {data.humidity}%</div>
                </div>
            </div>
        </div>
    )
}
