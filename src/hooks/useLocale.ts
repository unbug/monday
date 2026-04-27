import { useState, useEffect, useCallback } from 'react'
import {
  getLocale,
  setLocale,
  detectLocale,
  isLocaleAvailable,
  type Locale,
} from '../lib/i18n'

const STORAGE_KEY = 'monday-locale'

/**
 * Get initial locale: URL param > localStorage > detected > 'en'
 */
function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'

  // Check URL param first (?lang=zh)
  const urlParams = new URLSearchParams(window.location.search)
  const urlLang = urlParams.get('lang')
  if (urlLang && isLocaleAvailable(urlLang)) {
    return urlLang
  }

  // Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && isLocaleAvailable(stored)) {
    return stored
  }

  // Detect from browser
  return detectLocale()
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  // Sync with URL param changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const urlLang = urlParams.get('lang')
      if (urlLang && isLocaleAvailable(urlLang)) {
        setLocaleState(urlLang)
      }
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)

    // Update URL without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('lang', newLocale)
      history.replaceState(null, '', url.toString())
    }

    // Update HTML lang attribute
    document.documentElement.lang = newLocale
  }, [])

  // Set initial lang attribute
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return { locale, changeLocale }
}
