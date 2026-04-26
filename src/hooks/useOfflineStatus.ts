/**
 * useOfflineStatus — detects online/offline state via navigator.onLine
 * and window 'online'/'offline' events.
 *
 * Returns { online: boolean } that updates reactively.
 */

import { useState, useEffect } from 'react'

export function useOfflineStatus(): { online: boolean } {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online }
}
