/**
 * WebDAV client — connect to a user-supplied WebDAV server and sync
 * .monday data files (upload / download).
 *
 * Uses HTTP Basic Auth over standard WebDAV methods:
 *   PROPFIND — test connection / list directory
 *   PUT        — upload a file
 *   GET        — download a file
 *
 * Note: Many WebDAV servers do not send CORS headers. Users may need
 * a CORS proxy or browser extension for cross-origin sync.
 */

const WEBDAV_URL = 'monday-webdav-url'
const WEBDAV_USER = 'monday-webdav-user'
const WEBDAV_PASS = 'monday-webdav-pass'
const SYNC_TIMESTAMP = 'monday-webdav-sync-timestamp'

export interface WebDAVConfig {
  url: string
  username: string
  password: string
}

export interface WebDAVSyncResult {
  success: boolean
  message: string
  direction: 'upload' | 'download' | 'both'
  fileSize?: number
  timestamp?: number
}

export interface WebDAVConnectionStatus {
  connected: boolean
  error: string | null
}

/** Save WebDAV config to localStorage. */
export function saveWebDAVConfig(config: WebDAVConfig): void {
  localStorage.setItem(WEBDAV_URL, config.url)
  localStorage.setItem(WEBDAV_USER, config.username)
  localStorage.setItem(WEBDAV_PASS, config.password)
}

/** Load WebDAV config from localStorage. */
export function loadWebDAVConfig(): WebDAVConfig | null {
  const url = localStorage.getItem(WEBDAV_URL)
  const username = localStorage.getItem(WEBDAV_USER)
  const password = localStorage.getItem(WEBDAV_PASS)
  if (!url || !username || !password) return null
  return { url, username, password }
}

/** Clear WebDAV config from localStorage. */
export function clearWebDAVConfig(): void {
  localStorage.removeItem(WEBDAV_URL)
  localStorage.removeItem(WEBDAV_USER)
  localStorage.removeItem(WEBDAV_PASS)
  localStorage.removeItem(SYNC_TIMESTAMP)
}

/** Get the last sync timestamp. */
export function getSyncTimestamp(): number | null {
  const ts = localStorage.getItem(SYNC_TIMESTAMP)
  return ts ? Number(ts) : null
}

/** Save the last sync timestamp. */
export function setSyncTimestamp(ts: number): void {
  localStorage.setItem(SYNC_TIMESTAMP, String(ts))
}

/**
 * Test connection to a WebDAV server.
 * Sends a PROPFIND request to the server root.
 */
export async function testConnection(
  url: string,
  username: string,
  password: string,
): Promise<WebDAVConnectionStatus> {
  try {
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/xml',
        'Depth': '0',
      },
      body: '<?xml version="1.0" encoding="utf-8" ?><propfind xmlns="DAV:"><prop><current-user-principal/></prop></propfind>',
    })

    if (response.ok || response.status === 207) {
      return { connected: true, error: null }
    }

    // 401 = auth failed, 403 = forbidden, other = server issue
    if (response.status === 401) {
      return { connected: false, error: 'Authentication failed. Check your username and password.' }
    }
    if (response.status === 403) {
      return { connected: false, error: 'Access denied. Check your credentials and permissions.' }
    }

    return {
      connected: false,
      error: `Server responded with status ${response.status}. The server may not support WebDAV or CORS.`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('CORS') || message.includes('NetworkError') || message.includes('fetch')) {
      return {
        connected: false,
        error: `Network error: ${message}. The WebDAV server may not allow cross-origin requests. Try a CORS proxy or browser extension.`,
      }
    }
    return { connected: false, error: message }
  }
}

/**
 * Upload a .monday data file to the WebDAV server.
 * Uses PUT to overwrite the remote file.
 */
export async function uploadToWebDAV(
  url: string,
  username: string,
  password: string,
  filename: string,
  data: Uint8Array,
): Promise<WebDAVSyncResult> {
  try {
    const remoteUrl = url.endsWith('/') ? url : `${url}/`
    const response = await fetch(`${remoteUrl}${filename}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
    })

    if (response.ok || response.status === 201 || response.status === 204) {
      const timestamp = Date.now()
      setSyncTimestamp(timestamp)
      return {
        success: true,
        message: `Uploaded ${formatBytes(data.byteLength)} to WebDAV`,
        direction: 'upload',
        fileSize: data.byteLength,
        timestamp,
      }
    }

    return {
      success: false,
      message: `Upload failed: HTTP ${response.status}`,
      direction: 'upload',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Upload error: ${message}`,
      direction: 'upload',
    }
  }
}

/**
 * Download the .monday data file from the WebDAV server.
 * Returns the raw bytes, or null if not found.
 */
export async function downloadFromWebDAV(
  url: string,
  username: string,
  password: string,
  filename: string,
): Promise<{ data: Uint8Array; size: number } | null> {
  try {
    const remoteUrl = url.endsWith('/') ? url : `${url}/`
    const response = await fetch(`${remoteUrl}${filename}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
    })

    if (response.status === 404) {
      return null // No file yet on server
    }

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return {
      data: new Uint8Array(arrayBuffer),
      size: arrayBuffer.byteLength,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Download error: ${message}`)
  }
}

/**
 * Sync Monday data with a WebDAV server.
 * @param direction - 'upload' | 'download' | 'both'
 * @returns result with success status and message
 */
export async function syncWithWebDAV(
  config: WebDAVConfig,
  direction: 'upload' | 'download' | 'both' = 'both',
  getData?: () => Promise<Uint8Array>,
  onDataLoaded?: (data: Uint8Array) => void,
): Promise<WebDAVSyncResult> {
  const filename = 'monday-sync.monday'

  if (direction === 'upload' || direction === 'both') {
    const data = getData ? await getData() : new Uint8Array(0)
    const result = await uploadToWebDAV(config.url, config.username, config.password, filename, data)
    if (!result.success) return result
  }

  if (direction === 'download' || direction === 'both') {
    const downloaded = await downloadFromWebDAV(config.url, config.username, config.password, filename)
    if (downloaded === null) {
      return {
        success: true,
        message: 'No remote file found. Upload first to initialize.',
        direction: 'download',
      }
    }
    if (onDataLoaded) {
      onDataLoaded(downloaded.data)
    }
    return {
      success: true,
      message: `Downloaded ${formatBytes(downloaded.size)} from WebDAV`,
      direction: 'download',
      fileSize: downloaded.size,
      timestamp: Date.now(),
    }
  }

  return { success: true, message: 'No sync direction specified.', direction: 'upload' }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
