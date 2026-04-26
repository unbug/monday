/**
 * useNotifications — browser notification support for background completion.
 *
 * Requests permission on first use, tracks tab visibility, and provides
 * a sendNotification helper. Permission state is persisted in localStorage.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseNotificationsResult {
  /** Whether the user has granted notification permission */
  permission: 'granted' | 'denied' | 'default'
  /** Request notification permission (shows browser prompt) */
  requestPermission: () => Promise<void>
  /** Send a browser notification; no-op if permission is denied */
  sendNotification: (title: string, body: string) => void
  /** Whether the current tab is hidden (not visible to the user) */
  isTabHidden: boolean
}

const STORAGE_KEY = 'monday:notifications:permission'

/** Persist permission state to localStorage for cross-session recall. */
function getStoredPermission(): 'granted' | 'denied' | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as 'granted' | 'denied' | null
  } catch {
    return null
  }
}

function storePermission(p: 'granted' | 'denied') {
  try {
    localStorage.setItem(STORAGE_KEY, p)
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useNotifications(): UseNotificationsResult {
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'default'
  >(() => {
    const stored = getStoredPermission()
    if (stored) return stored
    if (typeof Notification === 'undefined') return 'denied'
    return 'default'
  })

  const [isTabHidden, setIsTabHidden] = useState(false)

  // Track tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.visibilityState === 'hidden')
    }

    document.addEventListener('visibilitychange', handleVisibility)
    // Initial check
    handleVisibility()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setPermission('denied')
      return
    }

    const result = await Notification.requestPermission()
    const stored: 'granted' | 'denied' = result === 'granted' ? 'granted' : 'denied'
    setPermission(result)
    storePermission(stored)
  }, [])

  const sendNotification = useCallback(
    (title: string, body: string) => {
      if (permission !== 'granted' || typeof Notification === 'undefined') {
        return
      }

      try {
        new Notification(title, { body, icon: '/favicon.svg', requireInteraction: false })
      } catch {
        // Notifications may fail if the page is not visible for too long
      }
    },
    [permission],
  )

  return { permission, requestPermission, sendNotification, isTabHidden }
}
