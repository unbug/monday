import { useState, useEffect, useCallback } from 'react'

interface UseServiceWorkerUpdateResult {
  /** True when a new service worker is installed and waiting to activate */
  hasUpdate: boolean
  /** Triggered when the new SW takes control of the page */
  onActivate: () => void
  /** The waiting service worker, or null */
  waitingWorker: ServiceWorker | null
}

/**
 * Detects when a new service worker is installed and waiting for the current
 * tab to close so it can activate. Prompts the user to reload.
 *
 * Works with vite-plugin-pwa's `registerType: 'autoUpdate'` mode.
 */
export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const reg = navigator.serviceWorker

    // When a new SW is found, it replaces the active one
    reg.addEventListener('updatefound', () => {
      const newWorker = (reg as ServiceWorkerContainer & { installing: ServiceWorker | null }).installing
      if (!newWorker) return

      setWaitingWorker(newWorker)

      // When the new SW reaches 'installed' state, it waits for activation
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          setHasUpdate(true)
        }
      })
    })

    // If there's already a waiting SW (e.g. page was just reloaded after install),
    // detect it immediately
    const waiting = (reg as ServiceWorkerContainer & { waiting: ServiceWorker | null }).waiting
    const active = (reg as ServiceWorkerContainer & { active: ServiceWorker | null }).active
    if (waiting && active) {
      setHasUpdate(true)
    }
  }, [])

  const onActivate = useCallback(() => {
    setHasUpdate(false)
    // Tell the waiting SW to take control immediately
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    // Reload to pick up the new SW
    window.location.reload()
  }, [waitingWorker])

  return { hasUpdate, onActivate, waitingWorker }
}
