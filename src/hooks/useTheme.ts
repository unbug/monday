import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'monday-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved)
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    getStoredMode() === 'system' ? getSystemTheme() : getStoredMode() as 'light' | 'dark'
  )

  const resolve = useCallback((m: ThemeMode) => {
    return m === 'system' ? getSystemTheme() : m
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(STORAGE_KEY, m)
    const r = m === 'system' ? getSystemTheme() : m
    setResolved(r)
    applyTheme(r)
  }, [])

  // Listen to system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode === 'system') {
        const r = getSystemTheme()
        setResolved(r)
        applyTheme(r)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  // Apply on mount
  useEffect(() => {
    applyTheme(resolve(mode))
  }, [])

  return { mode, resolved, setMode }
}
