/**
 * Usage analytics — tracks tokens consumed, average tps, and sessions per day.
 * Stored in IndexedDB so it survives browser resets (unlike localStorage).
 */

const DB_NAME = 'monday-usage-analytics'
const DB_VERSION = 1
const STORE_TOKENS = 'tokens'
const STORE_SESSIONS = 'sessions'
const STORE_TPS = 'tps'

interface TokenRecord {
  id: string
  modelId: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  timestamp: number
}

interface SessionRecord {
  id: string
  timestamp: number
}

interface TpsRecord {
  id: string
  modelId: string
  tokensPerSecond: number
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_TOKENS)) {
        const store = db.createObjectStore(STORE_TOKENS, { keyPath: 'id' })
        store.createIndex('modelId', 'modelId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_TPS)) {
        const store = db.createObjectStore(STORE_TPS, { keyPath: 'id' })
        store.createIndex('modelId', 'modelId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Record token usage for a generation.
 */
export function recordTokenUsage(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  tokensPerSecond: number,
): void {
  openDB().then((db) => {
    const tx = db.transaction(STORE_TOKENS, 'readwrite')
    const store = tx.objectStore(STORE_TOKENS)
    store.add({
      id: `${modelId}:${Date.now()}`,
      modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      timestamp: Date.now(),
    })
    // Also record tps
    if (tokensPerSecond > 0) {
      const tpsTx = db.transaction(STORE_TPS, 'readwrite')
      const tpsStore = tpsTx.objectStore(STORE_TPS)
      tpsStore.add({
        id: `${modelId}:tps:${Date.now()}`,
        modelId,
        tokensPerSecond,
        timestamp: Date.now(),
      })
    }
  }).catch(() => {
    // IndexedDB unavailable — silently ignore
  })
}

/**
 * Record a session creation event.
 */
export function recordSessionCreated(): void {
  openDB().then((db) => {
    const tx = db.transaction(STORE_SESSIONS, 'readwrite')
    const store = tx.objectStore(STORE_SESSIONS)
    store.add({
      id: `session:${Date.now()}`,
      timestamp: Date.now(),
    })
  }).catch(() => {
    // silently ignore
  })
}

/**
 * Get total tokens consumed by model, grouped by model.
 */
export function getTokenUsageByModel(): Promise<Array<{
  modelId: string
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  generationCount: number
  lastUsed: number | null
}>> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_TOKENS, 'readonly')
      const store = tx.objectStore(STORE_TOKENS)
      const request = store.getAll()
      request.onsuccess = () => {
        const records = (request.result as unknown[]) as TokenRecord[]
        const map = new Map<string, {
          totalPromptTokens: number
          totalCompletionTokens: number
          totalTokens: number
          generationCount: number
          lastUsed: number
        }>()
        for (const r of records) {
          const existing = map.get(r.modelId)
          if (existing) {
            existing.totalPromptTokens += r.promptTokens
            existing.totalCompletionTokens += r.completionTokens
            existing.totalTokens += r.totalTokens
            existing.generationCount += 1
            if (r.timestamp > existing.lastUsed) {
              existing.lastUsed = r.timestamp
            }
          } else {
            map.set(r.modelId, {
              totalPromptTokens: r.promptTokens,
              totalCompletionTokens: r.completionTokens,
              totalTokens: r.totalTokens,
              generationCount: 1,
              lastUsed: r.timestamp,
            })
          }
        }
        resolve(
          [...map.entries()]
            .sort(([, a], [, b]) => b.totalTokens - a.totalTokens)
            .map(([modelId, data]) => ({
              modelId,
              ...data,
              lastUsed: data.lastUsed > 0 ? data.lastUsed : null,
            })),
        )
      }
      request.onerror = () => resolve([])
    }).catch(() => resolve([]))
  })
}

/**
 * Get daily token usage for the last N days.
 */
export function getTokenUsageByDay(days: number): Promise<Array<{
  date: string
  label: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}>> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_TOKENS, 'readonly')
      const store = tx.objectStore(STORE_TOKENS)
      const request = store.getAll()
      request.onsuccess = () => {
        const records = (request.result as unknown[]) as TokenRecord[]
        const map = new Map<string, {
          promptTokens: number
          completionTokens: number
          totalTokens: number
        }>()
        for (const r of records) {
          const dateStr = new Date(r.timestamp).toISOString().split('T')[0]
          const existing = map.get(dateStr)
          if (existing) {
            existing.promptTokens += r.promptTokens
            existing.completionTokens += r.completionTokens
            existing.totalTokens += r.totalTokens
          } else {
            map.set(dateStr, {
              promptTokens: r.promptTokens,
              completionTokens: r.completionTokens,
              totalTokens: r.totalTokens,
            })
          }
        }
        const result: Array<{
          date: string
          label: string
          promptTokens: number
          completionTokens: number
          totalTokens: number
        }> = []
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        for (let i = 0; i < days; i++) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          const dayData = map.get(dateStr)
          const label = dayNames[date.getDay()]
          result.push({
            date: dateStr,
            label,
            promptTokens: dayData?.promptTokens ?? 0,
            completionTokens: dayData?.completionTokens ?? 0,
            totalTokens: dayData?.totalTokens ?? 0,
          })
        }
        resolve(result.reverse())
      }
      request.onerror = () => resolve([])
    }).catch(() => resolve([]))
  })
}

/**
 * Get session count by day for the last N days.
 */
export function getSessionCountByDay(days: number): Promise<Array<{
  date: string
  label: string
  count: number
}>> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly')
      const store = tx.objectStore(STORE_SESSIONS)
      const request = store.getAll()
      request.onsuccess = () => {
        const records = (request.result as unknown[]) as SessionRecord[]
        const map = new Map<string, number>()
        for (const r of records) {
          const dateStr = new Date(r.timestamp).toISOString().split('T')[0]
          map.set(dateStr, (map.get(dateStr) ?? 0) + 1)
        }
        const result: Array<{
          date: string
          label: string
          count: number
        }> = []
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          const label = dayNames[date.getDay()]
          result.push({
            date: dateStr,
            label,
            count: map.get(dateStr) ?? 0,
          })
        }
        resolve(result)
      }
      request.onerror = () => resolve([])
    }).catch(() => resolve([]))
  })
}

/**
 * Get average tps for a specific model.
 */
export function getAvgTps(modelId: string): Promise<number> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_TPS, 'readonly')
      const store = tx.objectStore(STORE_TPS)
      const index = store.index('modelId')
      const request = index.getAll(modelId)
      request.onsuccess = () => {
        const records = (request.result as unknown[]) as TpsRecord[]
        if (records.length === 0) {
          resolve(0)
          return
        }
        const sum = records.reduce((s: number, r: TpsRecord) => s + r.tokensPerSecond, 0)
        resolve(Math.round((sum / records.length) * 10) / 10)
      }
      request.onerror = () => resolve(0)
    }).catch(() => resolve(0))
  })
}

/**
 * Get recent generations (last 20) with model, tokens, and tps.
 */
export function getRecentGenerations(limit: number = 20): Promise<Array<{
  modelId: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  tokensPerSecond: number
  timestamp: number
}>> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_TOKENS, 'readonly')
      const store = tx.objectStore(STORE_TOKENS)
      const index = store.index('timestamp')
      const request = index.getAll()
      request.onsuccess = () => {
        const records = (request.result as unknown[]) as TokenRecord[]
        // Get tps data
        const tpsTx = db.transaction(STORE_TPS, 'readonly')
        const tpsStore = tpsTx.objectStore(STORE_TPS)
        const tpsIndex = tpsStore.index('timestamp')
        const tpsRequest = tpsIndex.getAll()
        tpsRequest.onsuccess = () => {
          const tpsRecords = (tpsRequest.result as unknown[]) as TpsRecord[]
          const modelTpsMap = new Map<string, { sum: number; count: number }>()
          for (const r of tpsRecords) {
            const existing = modelTpsMap.get(r.modelId)
            if (existing) {
              existing.sum += r.tokensPerSecond
              existing.count += 1
            } else {
              modelTpsMap.set(r.modelId, { sum: r.tokensPerSecond, count: 1 })
            }
          }
          const result = records
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map((r) => {
              const tpsData = modelTpsMap.get(r.modelId)
              const avgTps = tpsData && tpsData.count > 0
                ? Math.round((tpsData.sum / tpsData.count) * 10) / 10
                : 0
              return {
                modelId: r.modelId,
                promptTokens: r.promptTokens,
                completionTokens: r.completionTokens,
                totalTokens: r.totalTokens,
                tokensPerSecond: avgTps,
                timestamp: r.timestamp,
              }
            })
          resolve(result)
        }
        tpsRequest.onerror = () => {
          const result = records
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map((r) => ({
              modelId: r.modelId,
              promptTokens: r.promptTokens,
              completionTokens: r.completionTokens,
              totalTokens: r.totalTokens,
              tokensPerSecond: 0,
              timestamp: r.timestamp,
            }))
          resolve(result)
        }
      }
      request.onerror = () => resolve([])
    }).catch(() => resolve([]))
  })
}

/**
 * Get total tokens consumed across all models.
 */
export function getTotalTokensConsumed(): Promise<number> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_TOKENS, 'readonly')
      const store = tx.objectStore(STORE_TOKENS)
      const request = store.getAll()
      request.onsuccess = () => {
        const records = (request.result as unknown[]) as TokenRecord[]
        resolve(records.reduce((sum: number, r: TokenRecord) => sum + r.totalTokens, 0))
      }
      request.onerror = () => resolve(0)
    }).catch(() => resolve(0))
  })
}

/**
 * Get total sessions created.
 */
export function getTotalSessionCount(): Promise<number> {
  return new Promise((resolve) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly')
      const store = tx.objectStore(STORE_SESSIONS)
      const request = store.getAll()
      request.onsuccess = () => resolve((request.result as unknown[]).length)
      request.onerror = () => resolve(0)
    }).catch(() => resolve(0))
  })
}

/**
 * Get average sessions per day for the last N days.
 */
export function getAvgSessionsPerDay(days: number): Promise<number> {
  return getSessionCountByDay(days).then((data: Array<{ date: string; label: string; count: number }>) => {
    const total = data.reduce((sum: number, d: { count: number }) => sum + d.count, 0)
    return Math.round((total / days) * 10) / 10
  })
}
