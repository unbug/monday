import { useState, useEffect, useCallback } from 'react'

interface PWAInstallPrompt {
  prompt: () => void
}

export function useInstallPrompt(): {
  canInstall: boolean
  promptInstall: () => void
  dismissed: boolean
  onDismiss: () => void
} {
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === 'true')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as PWAInstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const onDismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }, [])

  return {
    canInstall: !!deferredPrompt && !dismissed,
    promptInstall,
    dismissed,
    onDismiss,
  }
}
