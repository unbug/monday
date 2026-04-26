import { useState, useEffect, useCallback } from 'react'
import {
  getTokenUsageByModel,
  getTokenUsageByDay,
  getSessionCountByDay,
  getAvgTps,
  getRecentGenerations,
  getTotalTokensConsumed,
  getTotalSessionCount,
  getAvgSessionsPerDay,
} from '../lib/usageAnalytics'

export interface UsageAnalyticsData {
  /** Total tokens consumed across all models */
  totalTokens: number
  /** Total sessions created */
  totalSessions: number
  /** Average sessions per day (last 7 days) */
  avgSessionsPerDay: number
  /** Per-model token usage */
  usageByModel: Array<{
    modelId: string
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
    generationCount: number
    lastUsed: number | null
  }>
  /** Daily token usage (last 7 days) */
  usageByDay: Array<{
    date: string
    label: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }>
  /** Daily session counts (last 7 days) */
  sessionsByDay: Array<{
    date: string
    label: string
    count: number
  }>
  /** Average tps for a model */
  avgTpsByModel: Record<string, number>
  /** Recent generations */
  recentGenerations: Array<{
    modelId: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    tokensPerSecond: number
    timestamp: number
  }>
  /** Loading state */
  loading: boolean
}

export function useUsageAnalytics(days: number = 7) {
  const [data, setData] = useState<UsageAnalyticsData>({
    totalTokens: 0,
    totalSessions: 0,
    avgSessionsPerDay: 0,
    usageByModel: [],
    usageByDay: [],
    sessionsByDay: [],
    avgTpsByModel: {},
    recentGenerations: [],
    loading: true,
  })

  const load = useCallback(async () => {
    const [
      totalTokens,
      totalSessions,
      avgSessionsPerDay,
      usageByModel,
      usageByDay,
      sessionsByDay,
      recentGenerations,
    ] = await Promise.all([
      getTotalTokensConsumed(),
      getTotalSessionCount(),
      getAvgSessionsPerDay(days),
      getTokenUsageByModel(),
      getTokenUsageByDay(days),
      getSessionCountByDay(days),
      getRecentGenerations(20),
    ])

    // Compute avg tps per model from recent generations
    const tpsMap: Record<string, number> = {}
    for (const gen of recentGenerations) {
      if (gen.tokensPerSecond > 0) {
        const current = tpsMap[gen.modelId] ?? 0
        const count = (tpsMap[`${gen.modelId}:count`] as number) ?? 0
        tpsMap[gen.modelId] = (current + gen.tokensPerSecond) / 2
        tpsMap[`${gen.modelId}:count`] = count + 1
      }
    }
    // Clean up count keys
    const cleanTpsMap: Record<string, number> = {}
    for (const key of Object.keys(tpsMap)) {
      if (!key.includes(':count')) {
        cleanTpsMap[key] = Math.round(tpsMap[key] * 10) / 10
      }
    }

    setData({
      totalTokens,
      totalSessions,
      avgSessionsPerDay,
      usageByModel,
      usageByDay,
      sessionsByDay,
      avgTpsByModel: cleanTpsMap,
      recentGenerations,
      loading: false,
    })
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  return { ...data, reload: load }
}
