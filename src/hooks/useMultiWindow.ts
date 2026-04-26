/**
 * useMultiWindow — manages cross-window communication via BroadcastChannel
 * and IndexedDB for shared session state.
 *
 * When a conversation is opened in a separate window, both windows share
 * IndexedDB (same origin) and sync changes via BroadcastChannel.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface WindowMessage {
  type: 'session-update' | 'session-delete' | 'sync-request' | 'sync-response'
  sessionId?: string
  sessions?: any[]
}

const CHANNEL_NAME = 'monday:multiwindow'

export interface UseMultiWindowResult {
  /** Open a conversation in a new browser window */
  openInNewWindow: (sessionId: string) => void
  /** Listen for cross-window session changes */
  onSessionChange: (handler: (type: 'update' | 'delete', sessionId: string) => void) => void
  /** Whether this window is a child window (opened via multi-window) */
  isChildWindow: boolean
  /** Session ID if this is a child window, null otherwise */
  childSessionId: string | null
}

export function useMultiWindow(): UseMultiWindowResult {
  const [isChildWindow, setIsChildWindow] = useState(false)
  const [childSessionId, setChildSessionId] = useState<string | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Detect if this is a child window (opened via ?window=sessionId)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const windowId = params.get('window')
    if (windowId === 'true') {
      const sessionId = params.get('sessionId')
      if (sessionId) {
        setIsChildWindow(true)
        setChildSessionId(sessionId)
      }
    }
  }, [])

  // Setup BroadcastChannel for cross-window sync
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = (event: MessageEvent<WindowMessage>) => {
      const { type, sessionId, sessions } = event.data

      if (type === 'session-update' && sessionId) {
        // Notify parent that a session was updated
        window.parent.postMessage({ type: 'monday:session-update', sessionId }, '*')
      }

      if (type === 'session-delete' && sessionId) {
        window.parent.postMessage({ type: 'monday:session-delete', sessionId }, '*')
      }

      if (type === 'sync-request') {
        // Child window responds to sync request with current sessions
        channel.postMessage({ type: 'sync-response', sessions: [] })
      }
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [])

  const openInNewWindow = useCallback((sessionId: string) => {
    const width = 900
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const url = `${window.location.origin}${window.location.pathname}?window=true&sessionId=${sessionId}`
    const win = window.open(
      url,
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    )

    if (win) {
      win.focus()
    }
  }, [])

  const onSessionChange = useCallback(
    (handler: (type: 'update' | 'delete', sessionId: string) => void) => {
      const listener = (event: MessageEvent) => {
        if (event.data?.type === 'monday:session-update') {
          handler('update', event.data.sessionId)
        }
        if (event.data?.type === 'monday:session-delete') {
          handler('delete', event.data.sessionId)
        }
      }
      window.addEventListener('message', listener)
      return () => window.removeEventListener('message', listener)
    },
    [],
  )

  return { openInNewWindow, onSessionChange, isChildWindow, childSessionId }
}
