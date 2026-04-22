/**
 * Model usage tracking — tracks how many times each model is used.
 * Stored in localStorage so recommendations persist across sessions.
 */

const STORAGE_KEY = 'monday:model_usage'

interface UsageData {
  /** Model ID → usage count */
  [modelId: string]: number
}

export function loadModelUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as UsageData
    // Validate: ensure all values are numbers
    for (const key of Object.keys(data)) {
      if (typeof data[key] !== 'number' || data[key] < 0) {
        delete data[key]
      }
    }
    return data
  } catch {
    return {}
  }
}

export function recordModelUsage(modelId: string): void {
  const usage = loadModelUsage()
  usage[modelId] = (usage[modelId] ?? 0) + 1
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  } catch {
    // localStorage full — silently ignore
  }
}

export function resetModelUsage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Get model IDs sorted by usage count (descending), then by release date (descending).
 * Returns the top N model IDs.
 */
export function getTopModels(n: number = 3): string[] {
  const usage = loadModelUsage()
  const entries = Object.entries(usage)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
  return entries.slice(0, n).map(([id]) => id)
}

/**
 * Check if a model is in the top recommended list.
 */
export function isTopModel(modelId: string, n: number = 3): boolean {
  return getTopModels(n).includes(modelId)
}
