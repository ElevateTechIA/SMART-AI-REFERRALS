'use client'

import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from './config'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Detect saved language from localStorage after hydration to avoid SSR mismatch
    const saved = localStorage.getItem('i18nextLng')
    if (saved && ['en', 'es'].includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved)
    }
  }, [])

  // Persist language changes to localStorage
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      localStorage.setItem('i18nextLng', lng)
    }
    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
