import { createContext } from 'react'
import { Language, TranslationKey } from './translations'

export interface I18nContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey, fallback?: string) => string
}

export const I18nContext = createContext<I18nContextType | null>(null)
