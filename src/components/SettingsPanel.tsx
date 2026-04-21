import { useState, useCallback } from 'react'
import type { ChatSession, GenerationParams } from '../types'

interface Props {
  session: ChatSession
  onUpdate: (session: ChatSession) => void
}

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_TOP_P = 0.9
const DEFAULT_MAX_TOKENS = 1024

export function SettingsPanel({ session, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const params = session.generationParams ?? {
    temperature: DEFAULT_TEMPERATURE,
    top_p: DEFAULT_TOP_P,
    maxTokens: DEFAULT_MAX_TOKENS,
  }

  const hasCustomParams =
    params.temperature !== DEFAULT_TEMPERATURE ||
    params.top_p !== DEFAULT_TOP_P ||
    params.maxTokens !== DEFAULT_MAX_TOKENS ||
    session.systemPrompt

  const updateParams = useCallback(
    (updates: Partial<GenerationParams>) => {
      const newParams = { ...params, ...updates }
      onUpdate({ ...session, generationParams: newParams, updatedAt: Date.now() })
    },
    [session, params, onUpdate],
  )

  const updateSystemPrompt = useCallback(
    (prompt: string) => {
      onUpdate({ ...session, systemPrompt: prompt, updatedAt: Date.now() })
    },
    [session, onUpdate],
  )

  const resetParams = useCallback(() => {
    onUpdate({
      ...session,
      generationParams: {
        temperature: DEFAULT_TEMPERATURE,
        top_p: DEFAULT_TOP_P,
        maxTokens: DEFAULT_MAX_TOKENS,
      },
      systemPrompt: '',
      updatedAt: Date.now(),
    })
  }, [session, onUpdate])

  return (
    <div className="settings-panel">
      <button
        className="settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Generation settings"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isOpen ? 'settings-chevron' : ''}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        Settings
        {hasCustomParams && <span className="settings-dot" />}
      </button>

      {isOpen && (
        <div className="settings-content">
          {/* Generation Parameters */}
          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-title">Generation Params</span>
              <button
                className="settings-reset-btn"
                onClick={resetParams}
                title="Reset to defaults"
              >
                Reset
              </button>
            </div>

            {/* Temperature */}
            <div className="settings-param">
              <label className="settings-label">
                Temperature
                <span className="settings-value">{params.temperature.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={params.temperature}
                onChange={(e) =>
                  updateParams({ temperature: parseFloat(e.target.value) })
                }
                className="settings-slider"
              />
              <div className="settings-range-labels">
                <span>Creative</span>
                <span>Precise</span>
              </div>
            </div>

            {/* Top P */}
            <div className="settings-param">
              <label className="settings-label">
                Top-p
                <span className="settings-value">{params.top_p.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.top_p}
                onChange={(e) => updateParams({ top_p: parseFloat(e.target.value) })}
                className="settings-slider"
              />
              <div className="settings-range-labels">
                <span>Strict</span>
                <span>Diverse</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="settings-param">
              <label className="settings-label">
                Max Tokens
                <span className="settings-value">{params.maxTokens}</span>
              </label>
              <input
                type="range"
                min="64"
                max="4096"
                step="64"
                value={params.maxTokens}
                onChange={(e) =>
                  updateParams({ maxTokens: parseInt(e.target.value) })
                }
                className="settings-slider"
              />
              <div className="settings-range-labels">
                <span>64</span>
                <span>4096</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-title">System Prompt</span>
            </div>
            <textarea
              className="settings-textarea"
              placeholder="Enter system prompt (optional)...&#10;&#10;e.g. You are a helpful coding assistant. Be concise and precise."
              value={session.systemPrompt ?? ''}
              onChange={(e) => updateSystemPrompt(e.target.value)}
              rows={4}
            />
            <p className="settings-hint">
              This prompt will be sent as the system message for each conversation.
              Leave empty to use the model's default behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
