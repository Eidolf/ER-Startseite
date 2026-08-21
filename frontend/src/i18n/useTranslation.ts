import { useContext } from 'react'
import { I18nContext } from './I18nContext'
import { Language, TranslationKey } from './translations'

export const useTranslation = () => {
    const ctx = useContext(I18nContext)
    if (!ctx) {
        return {
            language: 'en' as Language,
            setLanguage: () => {},
            t: (key: TranslationKey, fallback?: string) => fallback || key,
        }
    }
    return ctx
}
