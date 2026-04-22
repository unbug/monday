import { useState, useMemo } from 'react'
import { MODELS, getModelById } from '../lib/models'
import {
  loadModelUsage,
  getTotalUsage,
  getAllUsage,
  getWeeklyUsage,
  getPeakDay,
  resetModelUsage,
} from '../lib/modelUsage'

interface Props {
  onResetRecommendations?: () => void
}

/** Format a date string (YYYY-MM-DD) to a readable format */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${monthNames[date.getMonth()]} ${date.getDate()}`
}

/** Get a color for a model based on its provider */
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

/** Simple bar chart component */
function BarChart({
  data,
  maxValue,
  height = 120,
}: {
  data: Array<{ label: string; value: number; total?: number; color?: string }>
  maxValue: number
  height?: number
}) {
  if (maxValue === 0) {
    return (
      <div
        className="model-stats-chart model-stats-chart-empty"
        style={{ height }}
      >
        <span className="model-stats-chart-empty-text">No usage data yet</span>
      </div>
    )
  }

  return (
    <div className="model-stats-chart" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = maxValue > 0 ? ((item.value ?? item.total ?? 0) / maxValue) * 100 : 0
        return (
          <div key={i} className="model-stats-bar-group">
            <div
              className="model-stats-bar"
              style={{
                height: `${Math.max(barHeight, 2)}%`,
                backgroundColor: item.color ?? '#6366f1',
              }}
            />
            <span className="model-stats-bar-label">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Horizontal bar for model usage */
function ModelBar({
  modelId,
  count,
  maxCount,
}: {
  modelId: string
  count: number
  maxCount: number
}) {
  const model = getModelById(modelId)
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
  const color = getModelColor(modelId)

  return (
    <div className="model-stats-model-row">
      <span className="model-stats-model-name">{model?.name ?? modelId}</span>
      <div className="model-stats-model-bar">
        <div
          className="model-stats-model-bar-fill"
          style={{
            width: `${Math.max(percentage, 1)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="model-stats-model-count">{count}</span>
    </div>
  )
}

export function ModelStats({ onResetRecommendations }: Props) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('weekly')

  const totalUsage = getTotalUsage()
  const allUsage = getAllUsage()
  const weeklyData = getWeeklyUsage()
  const peakDay = getPeakDay()
  const usage = loadModelUsage()
  const totalModels = Object.keys(usage).length

  const maxWeekly = Math.max(...weeklyData.map((d) => d.total), 1)

  // Map weekly data to chart format
  const weeklyChartData = weeklyData.map((d) => ({
    label: d.label,
    value: d.total,
    color: '#6366f1',
  }))
  const maxAlltime = allUsage.length > 0 ? allUsage[0].count : 0

  // Most used model
  const topModel = allUsage.length > 0 ? getModelById(allUsage[0].modelId) : null

  // Group by provider for all-time chart
  const providerUsage = useMemo(() => {
    const map = new Map<string, number>()
    for (const { modelId, count } of allUsage) {
      const model = getModelById(modelId)
      const provider = model?.provider ?? 'Other'
      map.set(provider, (map.get(provider) ?? 0) + count)
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
  }, [allUsage])

  // Provider colors
  const providerColors: Record<string, string> = {
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
    'Other': '#9ca3af',
  }

  const providerChartData = allUsage.length > 0
    ? providerUsage.map(([provider, count]) => ({
        label: provider,
        value: count,
        color: providerColors[provider] ?? '#9ca3af',
      }))
    : []

  const maxProvider = providerChartData.length > 0
    ? Math.max(...providerChartData.map((d) => d.value), 1)
    : 1

  return (
    <div className="model-stats">
      <div className="model-stats-header">
        <h2 className="model-stats-title">Usage Statistics</h2>
        <p className="model-stats-desc">
          Track how you use models over time
        </p>
      </div>

      {/* Summary Cards */}
      <div className="model-stats-summary">
        <div className="model-stats-card">
          <span className="model-stats-card-icon">📊</span>
          <span className="model-stats-card-value">{totalUsage}</span>
          <span className="model-stats-card-label">Total Usage</span>
        </div>
        <div className="model-stats-card">
          <span className="model-stats-card-icon">🤖</span>
          <span className="model-stats-card-value">{totalModels}</span>
          <span className="model-stats-card-label">Models Used</span>
        </div>
        <div className="model-stats-card">
          <span className="model-stats-card-icon">🏆</span>
          <span className="model-stats-card-value">
            {topModel ? topModel.name.split(' ').slice(0, 2).join(' ') : '—'}
          </span>
          <span className="model-stats-card-label">Top Model</span>
        </div>
        <div className="model-stats-card">
          <span className="model-stats-card-icon">📅</span>
          <span className="model-stats-card-value">
            {peakDay ? formatDate(peakDay.date) : '—'}
          </span>
          <span className="model-stats-card-label">Peak Day</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="model-stats-tabs">
        <button
          className={`model-stats-tab ${activeTab === 'weekly' ? 'model-stats-tab-active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          Last 7 Days
        </button>
        <button
          className={`model-stats-tab ${activeTab === 'alltime' ? 'model-stats-tab-active' : ''}`}
          onClick={() => setActiveTab('alltime')}
        >
          All Time
        </button>
      </div>

      {/* Charts */}
      {activeTab === 'weekly' && (
        <div className="model-stats-section">
          <h3 className="model-stats-section-title">Daily Usage (Last 7 Days)</h3>
          <BarChart data={weeklyChartData} maxValue={maxWeekly} />
        </div>
      )}

      {activeTab === 'alltime' && (
        <>
          <div className="model-stats-section">
            <h3 className="model-stats-section-title">Usage by Model</h3>
            {allUsage.length > 0 ? (
              allUsage.map(({ modelId, count }) => (
                <ModelBar
                  key={modelId}
                  modelId={modelId}
                  count={count}
                  maxCount={maxAlltime}
                />
              ))
            ) : (
              <div className="model-stats-empty">
                <span>No usage data yet. Start using models to see statistics!</span>
              </div>
            )}
          </div>

          <div className="model-stats-section">
            <h3 className="model-stats-section-title">Usage by Provider</h3>
            {providerChartData.length > 0 && (
              <BarChart data={providerChartData} maxValue={maxProvider} height={140} />
            )}
          </div>
        </>
      )}

      {/* Reset Button */}
      {onResetRecommendations && (
        <div className="model-stats-footer">
          <button
            className="model-stats-reset-btn"
            onClick={onResetRecommendations}
          >
            Reset Recommendations
          </button>
        </div>
      )}
    </div>
  )
}
