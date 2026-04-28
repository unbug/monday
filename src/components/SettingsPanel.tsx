import { useState, useCallback, useEffect } from 'react'
import type { ChatSession, GenerationParams } from '../types'
import { useNotifications } from '../hooks/useNotifications'
import { t } from '../lib/i18n'
import type { Locale } from '../lib/i18n'
import { LanguagePicker } from './LanguagePicker'
import { HighContrastToggle } from './HighContrastToggle'
import { loadApiSettings, saveApiSettings, deleteApiSettings } from '../lib/storage'
import type { OpenAISettings } from '../lib/openaiApi'

interface Props {
  session: ChatSession
  onUpdate: (session: ChatSession) => void
  locale?: Locale
  onChangeLocale?: (locale: Locale) => void
  highContrast?: boolean
  onToggleHighContrast?: (hc: boolean) => void
  onSetProvider?: (provider: 'web-llm' | 'openai' | null) => void
  provider?: 'web-llm' | 'openai' | null
}

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_TOP_P = 0.9
const DEFAULT_MAX_TOKENS = 1024

export function SettingsPanel({ session, onUpdate, locale, onChangeLocale, highContrast, onToggleHighContrast, onSetProvider, provider }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const notifications = useNotifications()

  // v1.0.0: API settings state
  const [apiSettings, setApiSettings] = useState<OpenAISettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null)

  useEffect(() => {
    loadApiSettings().then((s) => setApiSettings(s)).catch(() => {})
  }, [])

  const handleSaveApiSettings = useCallback(async () => {
    if (!apiSettings) return
    setSaving(true)
    try {
      await saveApiSettings(apiSettings)
      setSaving(false)
    } catch {
      setSaving(false)
    }
  }, [apiSettings])

  const handleTestConnection = useCallback(async () => {
    if (!apiSettings) return
    setTesting(true)
    setTestResult(null)
    try {
      const resp = await fetch(apiSettings.baseUrl.replace(/\/+$/, '') + '/models', {
        headers: { Authorization: `Bearer ${apiSettings.apiKey}` },
      })
      if (resp.ok) {
        setTestResult('ok')
      } else {
        setTestResult('error')
      }
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }, [apiSettings])

  const handleClearApiSettings = useCallback(async () => {
    await deleteApiSettings()
    setApiSettings(null)
    setTestResult(null)
  }, [])

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

          {/* v1.0.0: External API Settings */}
          <div className="settings-section">
            <div className="settings-section-header">
              <span className="settings-section-title">{t('openai.title')}</span>
            </div>
            <p className="settings-hint">
              {t('openai.desc')}
            </p>

            {/* Provider toggle */}
            {onSetProvider && (
              <div className="settings-param">
                <label className="settings-label">
                  {t('openai.providerLabel')}
                </label>
                <div className="api-provider-toggle">
                  <button
                    className={`api-provider-btn ${!provider || provider === 'web-llm' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('web-llm')}
                    type="button"
                  >
                    {t('openai.providerLocal')}
                  </button>
                  <button
                    className={`api-provider-btn ${provider === 'openai' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('openai')}
                    type="button"
                  >
                    {t('openai.providerRemote')}
                  </button>
                </div>
              </div>
            )}

            {provider === 'openai' && (
              <>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('openai.baseUrl')}
                  </label>
                  <input
                    type="text"
                    className="settings-input api-url-input"
                    placeholder={t('openai.placeholderUrl')}
                    value={apiSettings?.baseUrl ?? ''}
                    onChange={(e) => setApiSettings(apiSettings ? { ...apiSettings, baseUrl: e.target.value } : apiSettings)}
                  />
                </div>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('openai.apiKey')}
                  </label>
                  <input
                    type="password"
                    className="settings-input api-key-input"
                    placeholder={t('openai.placeholderKey')}
                    value={apiSettings?.apiKey ?? ''}
                    onChange={(e) => setApiSettings(apiSettings ? { ...apiSettings, apiKey: e.target.value } : apiSettings)}
                  />
                </div>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('openai.modelId')}
                  </label>
                  <input
                    type="text"
                    className="settings-input api-model-input"
                    placeholder={t('openai.placeholderModel')}
                    value={apiSettings?.modelId ?? ''}
                    onChange={(e) => setApiSettings(apiSettings ? { ...apiSettings, modelId: e.target.value } : apiSettings)}
                  />
                </div>
                <div className="api-actions">
                  <button
                    className="api-save-btn"
                    onClick={handleSaveApiSettings}
                    disabled={saving || !apiSettings?.baseUrl || !apiSettings?.apiKey || !apiSettings?.modelId}
                    type="button"
                  >
                    {saving ? t('openai.saved') : t('openai.save')}
                  </button>
                  <button
                    className="api-test-btn"
                    onClick={handleTestConnection}
                    disabled={testing || !apiSettings?.baseUrl || !apiSettings?.apiKey}
                    type="button"
                  >
                    {testing ? t('openai.testing') : t('openai.testConnection')}
                  </button>
                  <button
                    className="api-clear-btn"
                    onClick={handleClearApiSettings}
                    type="button"
                  >
                    {t('openai.clear')}
                  </button>
                </div>
                {testResult === 'ok' && (
                  <span className="api-status api-status-ok">{t('openai.connected')}</span>
                )}
                {testResult === 'error' && (
                  <span className="api-status api-status-error">{t('openai.error')}</span>
                )}
              </>
            )}

            {provider === 'web-llm' && (
              <span className="api-status api-status-disabled">{t('openai.disabled')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
