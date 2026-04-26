/**
 * useWebDAV hook — manages WebDAV configuration, connection testing,
 * and data sync (upload / download) for cross-device synchronization.
 */

import { useState, useCallback, useRef } from 'react'
import type { WebDAVConfig, WebDAVSyncResult, WebDAVConnectionStatus } from '../lib/webdav'
import {
  saveWebDAVConfig,
  loadWebDAVConfig,
  clearWebDAVConfig,
  getSyncTimestamp,
  testConnection,
  syncWithWebDAV,
} from '../lib/webdav'

export interface UseWebDAVReturn {
  /** Saved WebDAV config, or null if not configured */
  config: WebDAVConfig | null
  /** Whether a config is saved */
  hasConfig: boolean
  /** Current form values for editing */
  url: string
  setUsername: (v: string) => void
  setPassword: (v: string) => void
  setUrl: (v: string) => void
  /** Whether config is being edited (unsaved changes) */
  hasChanges: boolean
  /** Save current form values as config */
  saveConfig: () => void
  /** Clear saved config */
  removeConfig: () => void
  /** Test connection to the configured server */
  testConnection: () => Promise<WebDAVConnectionStatus>
  /** Upload current app data to WebDAV */
  upload: () => Promise<WebDAVSyncResult>
  /** Download data from WebDAV and restore */
  download: (onDataLoaded: (data: Uint8Array) => void) => Promise<WebDAVSyncResult>
  /** Sync both ways */
  sync: (direction: 'upload' | 'download' | 'both') => Promise<WebDAVSyncResult>
  /** Connection test status */
  connectionStatus: WebDAVConnectionStatus | null
  /** Last sync timestamp */
  lastSyncTimestamp: number | null
  /** Loading state */
  loading: boolean
}

export function useWebDAV(): UseWebDAVReturn {
  const [config, setConfig] = useState<WebDAVConfig | null>(() => loadWebDAVConfig())
  const [url, setUrlState] = useState(config?.url ?? '')
  const [username, setUsername] = useState(config?.username ?? '')
  const [password, setPassword] = useState(config?.password ?? '')
  const [connectionStatus, setConnectionStatus] = useState<WebDAVConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const urlRef = useRef(url)
  const userRef = useRef(username)
  const passRef = useRef(password)

  const hasChanges =
    url !== (config?.url ?? '') ||
    username !== (config?.username ?? '') ||
    password !== (config?.password ?? '')

  const setUrl = useCallback((v: string) => {
    setUrlState(v)
    urlRef.current = v
  }, [])

  const setUsernameInner = useCallback((v: string) => {
    setUsername(v)
    userRef.current = v
  }, [])

  const setPasswordInner = useCallback((v: string) => {
    setPassword(v)
    passRef.current = v
  }, [])

  const saveConfig = useCallback(() => {
    const newConfig = { url: url.trim(), username: username.trim(), password: password }
    if (newConfig.url && newConfig.username && newConfig.password) {
      saveWebDAVConfig(newConfig)
      setConfig(newConfig)
    }
  }, [url, username, password])

  const removeConfig = useCallback(() => {
    clearWebDAVConfig()
    setConfig(null)
    setUrlState('')
    setUsername('')
    setPassword('')
    setConnectionStatus(null)
  }, [])

  const testConnectionInner = useCallback(async (): Promise<WebDAVConnectionStatus> => {
    const testUrl = url.trim() || (config?.url ?? '')
    const testUser = username.trim() || (config?.username ?? '')
    const testPass = password || (config?.password ?? '')

    if (!testUrl || !testUser || !testPass) {
      const status = { connected: false, error: 'URL, username, and password are required.' }
      setConnectionStatus(status)
      return status
    }

    setLoading(true)
    const result = await testConnection(testUrl, testUser, testPass)
    setConnectionStatus(result)
    setLoading(false)
    return result
  }, [url, username, password, config])

  const upload = useCallback(async (): Promise<WebDAVSyncResult> => {
    const uploadConfig = {
      url: url.trim() || (config?.url ?? ''),
      username: username.trim() || (config?.username ?? ''),
      password: password || (config?.password ?? ''),
    }

    if (!uploadConfig.url || !uploadConfig.username || !uploadConfig.password) {
      return { success: false, message: 'WebDAV config is not saved. Save config first.', direction: 'upload' }
    }

    setLoading(true)
    const result = await syncWithWebDAV(uploadConfig, 'upload')
    setLoading(false)
    return result
  }, [url, username, password, config])

  const download = useCallback(async (onDataLoaded: (data: Uint8Array) => void): Promise<WebDAVSyncResult> => {
    const downloadConfig = {
      url: url.trim() || (config?.url ?? ''),
      username: username.trim() || (config?.username ?? ''),
      password: password || (config?.password ?? ''),
    }

    if (!downloadConfig.url || !downloadConfig.username || !downloadConfig.password) {
      return { success: false, message: 'WebDAV config is not saved. Save config first.', direction: 'download' }
    }

    setLoading(true)
    const result = await syncWithWebDAV(downloadConfig, 'download', undefined, onDataLoaded)
    setLoading(false)
    return result
  }, [url, username, password, config])

  const sync = useCallback(async (direction: 'upload' | 'download' | 'both'): Promise<WebDAVSyncResult> => {
    const syncConfig = {
      url: url.trim() || (config?.url ?? ''),
      username: username.trim() || (config?.username ?? ''),
      password: password || (config?.password ?? ''),
    }

    if (!syncConfig.url || !syncConfig.username || !syncConfig.password) {
      return { success: false, message: 'WebDAV config is not saved. Save config first.', direction }
    }

    setLoading(true)
    const result = await syncWithWebDAV(syncConfig, direction)
    setLoading(false)
    return result
  }, [url, username, password, config])

  return {
    config,
    hasConfig: !!config,
    url,
    setUrl,
    setUsername: setUsernameInner,
    setPassword: setPasswordInner,
    hasChanges,
    saveConfig,
    removeConfig,
    testConnection: testConnectionInner,
    upload,
    download,
    sync,
    connectionStatus,
    lastSyncTimestamp: getSyncTimestamp(),
    loading,
  }
}
