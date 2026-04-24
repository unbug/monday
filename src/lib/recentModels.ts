/**
 * Recent models tracking — remembers the last N models used (by last load time).
 * Stored in localStorage so it persists across browser restarts.
 */

const STORAGE_KEY = 'monday:recent_models'

interface RecentModelsData {
  /** Ordered list of { modelId, timestamp } — most recent first */
  models: Array<{ modelId: string; timestamp: number }>
}

function loadRecentModels(): RecentModelsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { models: [] }
    const data = JSON.parse(raw) as RecentModelsData
    if (!Array.isArray(data.models)) return { models: [] }
    // Validate entries
    for (const entry of data.models) {
      if (typeof entry.modelId !== 'string' || typeof entry.timestamp !== 'number') {
        return { models: [] }
      }
    }
    return data
  } catch {
    return { models: [] }
  }
}

function saveRecentModels(data: RecentModelsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

/**
 * Record that a model was recently used.
 * Updates the timestamp if already present, or prepends as new.
 */
export function recordRecentModel(modelId: string): void {
  const data = loadRecentModels()
  // Remove existing entry for this model
  data.models = data.models.filter((e) => e.modelId !== modelId)
  // Prepend new entry
  data.models.unshift({ modelId, timestamp: Date.now() })
  // Keep only last 10
  data.models = data.models.slice(0, 10)
  saveRecentModels(data)
}

/**
 * Get the list of recently used models, most recent first.
 * Returns only model IDs that are still valid (within 30 days).
 */
export function getRecentModels(limit: number = 5): string[] {
  const data = loadRecentModels()
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  return data.models
    .filter((e) => e.timestamp >= thirtyDaysAgo)
    .slice(0, limit)
    .map((e) => e.modelId)
}

/**
 * Check if a model is in the recent list.
 */
export function isRecentModel(modelId: string): boolean {
  const data = loadRecentModels()
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  return data.models.some((e) => e.modelId === modelId && e.timestamp >= thirtyDaysAgo)
}

/**
 * Clear recent models history.
 */
export function resetRecentModels(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Get total size of localStorage used by Monday data.
 */
export function getLocalDataSize(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('monday:')) {
      const value = localStorage.getItem(key) || ''
      total += value.length * 2 // UTF-16 characters are 2 bytes each
    }
  }
  return total
}
