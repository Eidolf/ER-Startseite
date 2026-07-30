import { createContext } from 'react'
import { MonitoringConfig, MonitoringEntity, OverlayWidthPercent, MonitoringCard } from '../../types/monitoring'

export interface MonitoringContextType {
    isOpen: boolean
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
    widthPercent: OverlayWidthPercent
    setWidthPercent: (w: OverlayWidthPercent) => void
    activeZoneId: string
    setActiveZoneId: (zone: string) => void
    config: MonitoringConfig | null
    entities: Record<string, MonitoringEntity>
    isSystemOnline: boolean
    isEditMode: boolean
    setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>
    pairingCode: string | null
    clearPairingCode: () => void
    toggleEnabled: () => void
    toggleDemoMode: () => void
    toggleVarcoIntegration: () => void
    updatePollingInterval: (seconds: number) => void
    refreshConfig: () => Promise<void>
    saveConfig: (cfg: MonitoringConfig) => Promise<void>
    deleteCard: (cardId: string) => void
    addCard: (card: MonitoringCard) => void
    updateCardZone: (cardId: string, zoneId: string) => void
    moveCardOrder: (cardId: string, direction: 'up' | 'down') => void
    addZone: (name: string, icon?: string) => void
    deleteZone: (zoneId: string) => void
    toggleZoneVisibility: (zoneId: string) => void
    toggleCardVisibility: (cardId: string) => void
    resetMonitoringConfig: () => Promise<void>
}

export const MonitoringContext = createContext<MonitoringContextType | null>(null)
