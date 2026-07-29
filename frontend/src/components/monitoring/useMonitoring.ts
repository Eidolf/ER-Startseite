import { useContext } from 'react'
import { MonitoringContext } from './MonitoringContextDefinition'

export const useMonitoring = () => {
    const ctx = useContext(MonitoringContext)
    if (!ctx) {
        throw new Error('useMonitoring must be used within a MonitoringProvider')
    }
    return ctx
}
