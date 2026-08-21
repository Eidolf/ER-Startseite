import React, { useState, ReactNode } from 'react'
import { Language, TranslationKey, translations } from './translations'
import { getStoredLanguage, setStoredLanguage } from './index'
import { I18nContext } from './I18nContext'

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(getStoredLanguage)

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        setStoredLanguage(lang)
    }

    const t = (key: TranslationKey, fallback?: string): string => {
        const langDict = translations[language] || translations.en
        return langDict[key] || translations.en[key] || fallback || key
    }

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    )
}
