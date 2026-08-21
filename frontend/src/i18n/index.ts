import { Language, TranslationKey, translations } from './translations'
export type { Language, TranslationKey }
export { translations }
export { I18nProvider } from './I18nProvider'
export { useTranslation } from './useTranslation'
export { I18nContext } from './I18nContext'

const STORAGE_LANG_KEY = 'er_language'

export const getStoredLanguage = (): Language => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_LANG_KEY) as Language
        if (saved === 'en' || saved === 'de') return saved
        const navLang = navigator.language?.toLowerCase() || ''
        if (navLang.startsWith('de')) return 'de'
    }
    return 'en'
}

export const setStoredLanguage = (lang: Language) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_LANG_KEY, lang)
    }
}
