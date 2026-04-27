import { useState, useCallback } from 'react'
import type { ChatSession, GenerationParams } from '../types'
import { useNotifications } from '../hooks/useNotifications'
import { t } from '../lib/i18n'
import type { Locale } from '../lib/i18n'
import { LanguagePicker } from './LanguagePicker'
import { HighContrastToggle } from './HighContrastToggle'

interface Props {
  session: ChatSession
  onUpdate: (session: ChatSession) => void
  locale?: Locale
  onChangeLocale?: (locale: Locale) => void
  highContrast?: boolean
  onToggleHighContrast?: (hc: boolean) => void
}

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_TOP_P = 0.9
const DEFAULT_MAX_TOKENS = 1024

export function SettingsPanel({ session, onUpdate, locale, onChangeLocale, highContrast, onToggleHighContrast }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const notifications = useNotifications()

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
        title={t('settings.title')}
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
        {t('settings.title')}
        {hasCustomParams && <span className="settings-dot" />}
      </button>

      {isOpen && (
        <div className="settings-content">
          {/* Generation Parameters */}
          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-title">{t('settings.params')}</span>
              <button
                className="settings-reset-btn"
                onClick={resetParams}
                title={t('settings.reset')}
              >
                {t('settings.reset')}
              </button>
            </div>

            {/* Temperature */}
            <div className="settings-param">
              <label className="settings-label">
                {t('settings.temperature')}
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
                <span>{t('settings.creative')}</span>
                <span>{t('settings.precise')}</span>
              </div>
            </div>

            {/* Top P */}
            <div className="settings-param">
              <label className="settings-label">
                {t('settings.topP')}
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
                <span>{t('settings.strict')}</span>
                <span>{t('settings.diverse')}</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="settings-param">
              <label className="settings-label">
                {t('settings.maxTokens')}
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
              <span className="settings-section-title">{t('settings.systemPrompt')}</span>
            </div>
            <textarea
              className="settings-textarea"
              placeholder={t('settings.systemPromptPlaceholder')}
              value={session.systemPrompt ?? ''}
              onChange={(e) => updateSystemPrompt(e.target.value)}
              rows={4}
            />
            <p className="settings-hint">
              {t('settings.systemPromptHint')}
            </p>
          </div>

          {/* Language Picker */}
          {onChangeLocale && (
            <LanguagePicker locale={locale ?? 'en'} onChange={onChangeLocale} />
          )}

          {/* Notifications */}
          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-title">{t('settings.notifications')}</span>
            </div>
            <p className="settings-hint">
              {t('settings.notificationsHint')}
            </p>
            {notifications.permission === 'default' && (
              <button
                className="settings-notify-btn"
                onClick={() => notifications.requestPermission()}
              >
                {t('settings.allowNotifications')}
              </button>
            )}
            {notifications.permission === 'granted' && (
              <span className="settings-notify-status settings-notify-ok">
                {t('settings.notificationsEnabled')}
              </span>
            )}
            {notifications.permission === 'denied' && (
              <span className="settings-notify-status settings-notify-blocked">
                {t('settings.notificationsBlocked')}
              </span>
            )}
          </div>

          {/* High Contrast */}
          {onToggleHighContrast !== undefined && (
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-title">{t('settings.highContrast')}</span>
              </div>
              <p className="settings-hint">
                {t('settings.highContrastHint')}
              </p>
              <HighContrastToggle
                highContrast={highContrast ?? false}
                onChange={onToggleHighContrast}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
