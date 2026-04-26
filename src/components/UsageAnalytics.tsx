import { useMemo } from 'react'
import { useUsageAnalytics } from '../hooks/useUsageAnalytics'
import { getModelById } from '../lib/models'

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

/** Format a date string to readable format */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${monthNames[date.getMonth()]} ${date.getDate()}`
}

/** Format timestamp to relative time */
function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/** Get model color */
function getModelColor(modelId: string): string {
  const model = getModelById(modelId)
  const provider = model?.provider ?? ''
  const colors: Record<string, string> = {
    'Alibaba': '#6366f1',
    'Google': '#f59e0b',
    'Microsoft': '#3b82f6',
    'Meta': '#10b981',
    'HuggingFace': '#ec4899',
    'DeepSeek': '#8b5cf6',
    'Community': '#64748b',
    'Stability AI': '#06b6d4',
    'Shanghai AI Lab': '#84cc16',
    'Allen Institute': '#f97316',
  }
  return colors[provider] ?? '#6b7280'
}

/** Simple vertical bar chart */
function BarChart({
  data,
  maxValue,
  height = 120,
  showLabels = true,
}: {
  data: Array<{ label: string; value: number; color?: string }>
  maxValue: number
  height?: number
  showLabels?: boolean
}) {
  if (maxValue === 0) {
    return (
      <div
        className="usage-analytics-chart usage-analytics-chart-empty"
        style={{ height }}
      >
        <span className="usage-analytics-chart-empty-text">No data yet</span>
      </div>
    )
  }

  return (
    <div className="usage-analytics-chart" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = maxValue > 0 ? ((item.value ?? 0) / maxValue) * 100 : 0
        return (
          <div key={i} className="usage-analytics-bar-group">
            <div
              className="usage-analytics-bar"
              style={{
                height: `${Math.max(barHeight, 2)}%`,
                backgroundColor: item.color ?? '#6366f1',
              }}
            />
            {showLabels && (
              <span className="usage-analytics-bar-label">{item.label}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Horizontal bar for model token usage */
function TokenBar({
  modelId,
  totalTokens,
  maxTokens,
}: {
  modelId: string
  totalTokens: number
  maxTokens: number
}) {
  const model = getModelById(modelId)
  const percentage = maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0
  const color = getModelColor(modelId)

  return (
    <div className="usage-analytics-model-row">
      <span className="usage-analytics-model-name">{model?.name ?? modelId}</span>
      <div className="usage-analytics-model-bar">
        <div
          className="usage-analytics-model-bar-fill"
          style={{
            width: `${Math.max(percentage, 1)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="usage-analytics-model-count">{formatBytes(totalTokens)}</span>
    </div>
  )
}

export function UsageAnalytics() {
  const {
    totalTokens,
    totalSessions,
    avgSessionsPerDay,
    usageByModel,
    usageByDay,
    sessionsByDay,
    avgTpsByModel,
    recentGenerations,
    loading,
  } = useUsageAnalytics(7)

  const maxDailyTokens = useMemo(() => {
    return Math.max(...usageByDay.map((d) => d.totalTokens), 1)
  }, [usageByDay])

  const maxDailySessions = useMemo(() => {
    return Math.max(...sessionsByDay.map((d) => d.count), 1)
  }, [sessionsByDay])

  const maxModelTokens = useMemo(() => {
    return usageByModel.length > 0 ? usageByModel[0].totalTokens : 0
  }, [usageByModel])

  // Compute overall avg tps from avgTpsByModel
  const tpsValues = Object.values(avgTpsByModel)
  const overallAvgTps = tpsValues.length > 0
    ? Math.round((tpsValues.reduce((s, v) => s + v, 0) / tpsValues.length) * 10) / 10
    : 0

  if (loading) {
    return (
      <div className="usage-analytics">
        <div className="usage-analytics-header">
          <h2 className="usage-analytics-title">Usage Analytics</h2>
          <p className="usage-analytics-desc">
            Track token usage, throughput, and session activity
          </p>
        </div>
        <div className="usage-analytics-loading">
          <span>Loading analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="usage-analytics">
      <div className="usage-analytics-header">
        <h2 className="usage-analytics-title">Usage Analytics</h2>
        <p className="usage-analytics-desc">
          Track token usage, throughput, and session activity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="usage-analytics-summary">
        <div className="usage-analytics-card">
          <span className="usage-analytics-card-icon">🔢</span>
          <span className="usage-analytics-card-value">{totalTokens.toLocaleString()}</span>
          <span className="usage-analytics-card-label">Total Tokens</span>
        </div>
        <div className="usage-analytics-card">
          <span className="usage-analytics-card-icon">⚡</span>
          <span className="usage-analytics-card-value">{overallAvgTps}</span>
          <span className="usage-analytics-card-label">Avg TPS</span>
        </div>
        <div className="usage-analytics-card">
          <span className="usage-analytics-card-icon">💬</span>
          <span className="usage-analytics-card-value">{totalSessions.toLocaleString()}</span>
          <span className="usage-analytics-card-label">Total Sessions</span>
        </div>
        <div className="usage-analytics-card">
          <span className="usage-analytics-card-icon">📅</span>
          <span className="usage-analytics-card-value">{avgSessionsPerDay}</span>
          <span className="usage-analytics-card-label">Sessions/Day</span>
        </div>
      </div>

      {/* Token Usage by Model */}
      <div className="usage-analytics-section">
        <h3 className="usage-analytics-section-title">Token Usage by Model</h3>
        {usageByModel.length > 0 ? (
          usageByModel.map(({ modelId, totalTokens: modelTokens, generationCount }) => (
            <TokenBar
              key={modelId}
              modelId={modelId}
              totalTokens={modelTokens}
              maxTokens={maxModelTokens}
            />
          ))
        ) : (
          <div className="usage-analytics-empty">
            <span>Start generating responses to see token usage stats!</span>
          </div>
        )}
      </div>

      {/* Daily Token Usage Chart */}
      {usageByDay.length > 0 && (
        <div className="usage-analytics-section">
          <h3 className="usage-analytics-section-title">Daily Token Usage (Last 7 Days)</h3>
          <BarChart
            data={usageByDay.map((d) => ({
              label: d.label,
              value: d.totalTokens,
              color: '#6366f1',
            }))}
            maxValue={maxDailyTokens}
          />
        </div>
      )}

      {/* Sessions per Day Chart */}
      {sessionsByDay.length > 0 && (
        <div className="usage-analytics-section">
          <h3 className="usage-analytics-section-title">Sessions per Day (Last 7 Days)</h3>
          <BarChart
            data={sessionsByDay.map((d) => ({
              label: d.label,
              value: d.count,
              color: '#8b5cf6',
            }))}
            maxValue={maxDailySessions}
          />
        </div>
      )}

      {/* Per-Model Avg TPS */}
      {Object.keys(avgTpsByModel).length > 0 && (
        <div className="usage-analytics-section">
          <h3 className="usage-analytics-section-title">Average TPS by Model</h3>
          <div className="usage-analytics-tps-grid">
            {Object.entries(avgTpsByModel).map(([modelId, tps]) => {
              const model = getModelById(modelId)
              return (
                <div key={modelId} className="usage-analytics-tps-card">
                  <span className="usage-analytics-tps-model">{model?.name ?? modelId}</span>
                  <span className="usage-analytics-tps-value">{tps} tps</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Generations */}
      {recentGenerations.length > 0 && (
        <div className="usage-analytics-section">
          <h3 className="usage-analytics-section-title">Recent Generations</h3>
          <div className="usage-analytics-table">
            <div className="usage-analytics-table-header">
              <span>Model</span>
              <span>Prompt</span>
              <span>Completion</span>
              <span>Total</span>
              <span>TPS</span>
              <span>Time</span>
            </div>
            {recentGenerations.map((gen, i) => {
              const model = getModelById(gen.modelId)
              return (
                <div key={i} className="usage-analytics-table-row">
                  <span className="usage-analytics-table-model">
                    {model?.name ?? gen.modelId}
                  </span>
                  <span className="usage-analytics-table-cell">{gen.promptTokens.toLocaleString()}</span>
                  <span className="usage-analytics-table-cell">{gen.completionTokens.toLocaleString()}</span>
                  <span className="usage-analytics-table-cell">{gen.totalTokens.toLocaleString()}</span>
                  <span className="usage-analytics-table-cell">{gen.tokensPerSecond > 0 ? `${gen.tokensPerSecond} tps` : '—'}</span>
                  <span className="usage-analytics-table-cell usage-analytics-table-time">
                    {formatRelative(gen.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
