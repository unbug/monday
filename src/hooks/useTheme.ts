import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'monday-theme'
const HIGH_CONTRAST_KEY = 'monday-high-contrast'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

function getStoredHighContrast(): boolean {
  try {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true'
  } catch {
    return false
  }
}

function applyTheme(resolved: 'light' | 'dark', highContrast: boolean) {
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.classList.toggle('light-theme', resolved === 'light')
  document.documentElement.classList.toggle('high-contrast', highContrast)
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    const m = getStoredMode()
    return m === 'system' ? getSystemTheme() : (m as 'light' | 'dark')
  })
  const [highContrast, setHighContrastState] = useState(getStoredHighContrast)

  const resolve = useCallback((m: ThemeMode) => {
    return m === 'system' ? getSystemTheme() : m
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(THEME_KEY, m)
    const r = m === 'system' ? getSystemTheme() : m
    setResolved(r)
    applyTheme(r, highContrast)
  }, [highContrast])

  const setHighContrast = useCallback((hc: boolean) => {
    setHighContrastState(hc)
    try {
      localStorage.setItem(HIGH_CONTRAST_KEY, String(hc))
    } catch {
      // localStorage unavailable
    }
    applyTheme(resolved, hc)
  }, [resolved])

  // Listen to system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode === 'system') {
        const r = getSystemTheme()
        setResolved(r)
        applyTheme(r, highContrast)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode, highContrast])

  // Apply on mount
  useEffect(() => {
    applyTheme(resolve(mode), highContrast)
  }, [])

  return { mode, resolved, setMode, highContrast, setHighContrast }
}
