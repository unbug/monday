/**
 * Model usage tracking — tracks how many times each model is used.
 * Stored in localStorage so recommendations persist across sessions.
 */

const STORAGE_KEY = 'monday:model_usage'

interface UsageData {
  /** Model ID → usage count */
  [modelId: string]: number
}

interface UsageTimestampsData {
  /** Model ID → array of timestamps (ms) when model was used */
  [modelId: string]: number[]
}

interface UsageHistoryData {
  /** Daily usage: "YYYY-MM-DD" → { [modelId]: count } */
  [date: string]: { [modelId: string]: number }
}

function loadUsageData(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as UsageData
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

function loadUsageTimestamps(): UsageTimestampsData {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:timestamps`)
    if (!raw) return {}
    const data = JSON.parse(raw) as UsageTimestampsData
    for (const key of Object.keys(data)) {
      if (!Array.isArray(data[key]) || data[key].some((t) => typeof t !== 'number')) {
        delete data[key]
      }
    }
    return data
  } catch {
    return {}
  }
}

function saveUsageTimestamps(data: UsageTimestampsData): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:timestamps`, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function loadUsageHistory(): UsageHistoryData {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:history`)
    if (!raw) return {}
    const data = JSON.parse(raw) as UsageHistoryData
    // Validate structure
    for (const date of Object.keys(data)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        delete data[date]
        continue
      }
      for (const modelId of Object.keys(data[date])) {
        if (typeof data[date][modelId] !== 'number') {
          delete data[date][modelId]
        }
      }
    }
    return data
  } catch {
    return {}
  }
}

function saveUsageHistory(data: UsageHistoryData): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:history`, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function loadModelUsage(): UsageData {
  return loadUsageData()
}

export function recordModelUsage(modelId: string): void {
  const usage = loadUsageData()
  usage[modelId] = (usage[modelId] ?? 0) + 1
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  } catch {
    // localStorage full — silently ignore
  }

  // Record timestamp
  const timestamps = loadUsageTimestamps()
  if (!timestamps[modelId]) timestamps[modelId] = []
  timestamps[modelId].push(Date.now())
  saveUsageTimestamps(timestamps)

  // Update daily history
  const today = new Date().toISOString().split('T')[0]
  const history = loadUsageHistory()
  if (!history[today]) history[today] = {}
  history[today][modelId] = (history[today][modelId] ?? 0) + 1
  saveUsageHistory(history)
}

export function resetModelUsage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(`${STORAGE_KEY}:timestamps`)
    localStorage.removeItem(`${STORAGE_KEY}:history`)
  } catch {
    // ignore
  }
}

/**
 * Get model IDs sorted by usage count (descending), then by release date (descending).
 * Returns the top N model IDs.
 */
export function getTopModels(n: number = 3): string[] {
  const usage = loadUsageData()
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

/**
 * Get total usage count across all models.
 */
export function getTotalUsage(): number {
  const usage = loadUsageData()
  return Object.values(usage).reduce((sum, count) => sum + count, 0)
}

/**
 * Get usage counts for all models, sorted descending.
 * Returns array of { modelId, count }.
 */
export function getAllUsage(): Array<{ modelId: string; count: number }> {
  const usage = loadUsageData()
  return Object.entries(usage)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([modelId, count]) => ({ modelId, count }))
}

/**
 * Get daily usage history for the last N days.
 * Returns array of { date, total, byModel }.
 */
export function getDailyHistory(days: number = 30): Array<{
  date: string
  total: number
  byModel: { [modelId: string]: number }
}> {
  const history = loadUsageHistory()
  const result: Array<{
    date: string
    total: number
    byModel: { [modelId: string]: number }
  }> = []

  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayData = history[dateStr]
    if (dayData) {
      const total = Object.values(dayData).reduce((sum, c) => sum + c, 0)
      result.push({ date: dateStr, total, byModel: dayData })
    }
  }

  return result
}

/**
 * Get usage count for a specific model in the last N days.
 */
export function getRecentUsage(modelId: string, days: number = 30): number {
  const history = loadUsageHistory()
  let total = 0

  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    total += history[dateStr]?.[modelId] ?? 0
  }

  return total
}

/**
 * Get the date with highest usage (peak day).
 */
export function getPeakDay(): { date: string; count: number } | null {
  const history = loadUsageHistory()
  let peakDate = ''
  let peakCount = 0

  for (const [date, models] of Object.entries(history)) {
    const total = Object.values(models).reduce((sum, c) => sum + c, 0)
    if (total > peakCount) {
      peakDate = date
      peakCount = total
    }
  }

  return peakCount > 0 ? { date: peakDate, count: peakCount } : null
}

/**
 * Get usage for the last 7 days (for chart rendering).
 */
export function getWeeklyUsage(): Array<{
  date: string
  label: string
  total: number
}> {
  const history = loadUsageHistory()
  const result: Array<{
    date: string
    label: string
    total: number
  }> = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayData = history[dateStr]
    const total = dayData ? Object.values(dayData).reduce((sum, c) => sum + c, 0) : 0
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const label = dayNames[date.getDay()]
    result.push({ date: dateStr, label, total })
  }

  return result
}
