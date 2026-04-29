import { useState, useCallback, useEffect } from 'react'
import type { ChatSession, GenerationParams } from '../types'
import { useNotifications } from '../hooks/useNotifications'
import { t } from '../lib/i18n'
import type { Locale } from '../lib/i18n'
import { LanguagePicker } from './LanguagePicker'
import { HighContrastToggle } from './HighContrastToggle'
import { loadApiSettings, saveApiSettings, deleteApiSettings, loadOllamaSettings, saveOllamaSettings, deleteOllamaSettings, loadLmStudioSettings, saveLmStudioSettings, deleteLmStudioSettings, loadLlamaCppSettings, saveLlamaCppSettings, deleteLlamaCppSettings, loadVllmSettings, saveVllmSettings, deleteVllmSettings, loadDeepSeekSettings, saveDeepSeekSettings, deleteDeepSeekSettings, loadSearXngSettings, saveSearXngSettings, deleteSearXngSettings } from '../lib/storage'
import type { OpenAISettings } from '../lib/openaiApi'
import type { OllamaModel } from '../lib/ollamaApi'
import type { LlamaCppModel } from '../lib/llamaCppApi'
import type { LmStudioModel } from '../lib/lmStudioApi'
import type { VllmModel } from '../lib/vllmApi'
import type { DeepSeekModel } from '../lib/deepSeekApi'
import { fetchOllamaModels } from '../lib/ollamaApi'
import { fetchLmStudioModels } from '../lib/lmStudioApi'
import { fetchVllmModels } from '../lib/vllmApi'
import { fetchDeepSeekModels } from '../lib/deepSeekApi'

interface Props {
  session: ChatSession
  onUpdate: (session: ChatSession) => void
  locale?: Locale
  onChangeLocale?: (locale: Locale) => void
  highContrast?: boolean
  onToggleHighContrast?: (hc: boolean) => void
  onSetProvider?: (provider: 'web-llm' | 'openai' | 'ollama' | 'lmstudio' | 'llamacpp' | 'vllm' | 'deepseek' | null) => void
  provider?: 'web-llm' | 'openai' | 'ollama' | 'lmstudio' | 'llamacpp' | 'vllm' | 'deepseek' | null
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

  // v1.0.1: Ollama settings state
  const [ollamaSettings, setOllamaSettings] = useState<{ url: string; modelId: string } | null>(null)
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaDiscovering, setOllamaDiscovering] = useState(false)
  const [ollamaSaving, setOllamaSaving] = useState(false)
  const [ollamaTestResult, setOllamaTestResult] = useState<'ok' | 'error' | null>(null)

  // v1.0.3: llama.cpp settings state
  const [llamaCppSettings, setLlamaCppSettings] = useState<{ url: string; modelId: string } | null>(null)
  const [llamaCppModels, setLlamaCppModels] = useState<LlamaCppModel[]>([])
  const [llamaCppDiscovering, setLlamaCppDiscovering] = useState(false)
  const [llamaCppSaving, setLlamaCppSaving] = useState(false)
  const [llamaCppTestResult, setLlamaCppTestResult] = useState<'ok' | 'error' | null>(null)

  // v1.0.2: LM Studio settings state
  const [lmStudioSettings, setLmStudioSettings] = useState<{ url: string; modelId: string } | null>(null)
  const [lmStudioModels, setLmStudioModels] = useState<LmStudioModel[]>([])
  const [lmStudioDiscovering, setLmStudioDiscovering] = useState(false)
  const [lmStudioSaving, setLmStudioSaving] = useState(false)
  const [lmStudioTestResult, setLmStudioTestResult] = useState<'ok' | 'error' | null>(null)

  // v1.0.4: vLLM settings state
  const [vllmSettings, setVllmSettings] = useState<{ url: string; modelId: string } | null>(null)
  const [vllmModels, setVllmModels] = useState<VllmModel[]>([])
  const [vllmDiscovering, setVllmDiscovering] = useState(false)
  const [vllmSaving, setVllmSaving] = useState(false)
  const [vllmTestResult, setVllmTestResult] = useState<'ok' | 'error' | null>(null)

  // v1.0.5: DeepSeek settings state
  const [deepSeekSettings, setDeepSeekSettings] = useState<{ baseUrl: string; apiKey: string; modelId: string } | null>(null)
  const [deepSeekModels, setDeepSeekModels] = useState<DeepSeekModel[]>([])
  const [deepSeekDiscovering, setDeepSeekDiscovering] = useState(false)
  const [deepSeekSaving, setDeepSeekSaving] = useState(false)
  const [deepSeekTestResult, setDeepSeekTestResult] = useState<'ok' | 'error' | null>(null)

  // v1.0.7: SearXNG settings state
  const [searxngSettings, setSearXngSettings] = useState<{ url: string } | null>(null)
  const [searxngSaving, setSearXngSaving] = useState(false)
  const [searxngTestResult, setSearXngTestResult] = useState<'ok' | 'error' | null>(null)

  useEffect(() => {
    loadApiSettings().then((s) => setApiSettings(s)).catch(() => {})
    loadOllamaSettings().then((s) => {
      if (s) setOllamaSettings({ url: s.url, modelId: s.modelId })
    }).catch(() => {})
    loadLlamaCppSettings().then((s) => {
      if (s) setLlamaCppSettings({ url: s.url, modelId: s.modelId })
    }).catch(() => {})
    loadLmStudioSettings().then((s) => {
      if (s) setLmStudioSettings({ url: s.url, modelId: s.modelId })
    }).catch(() => {})
    loadVllmSettings().then((s) => {
      if (s) setVllmSettings({ url: s.url, modelId: s.modelId })
    }).catch(() => {})
    loadDeepSeekSettings().then((s) => {
      if (s) setDeepSeekSettings({ baseUrl: s.baseUrl, apiKey: s.apiKey, modelId: s.modelId })
    }).catch(() => {})
    loadSearXngSettings().then((s) => {
      if (s) setSearXngSettings({ url: s.url })
    }).catch(() => {})
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

  const handleDiscoverModels = useCallback(async () => {
    if (!ollamaSettings?.url) return
    setOllamaDiscovering(true)
    setOllamaTestResult(null)
    try {
      const models = await fetchOllamaModels(ollamaSettings.url)
      setOllamaModels(models)
    } catch {
      setOllamaModels([])
    }
    setOllamaDiscovering(false)
  }, [ollamaSettings])

  const handleTestOllama = useCallback(async () => {
    if (!ollamaSettings?.url || !ollamaSettings?.modelId) return
    setOllamaTestResult(null)
    try {
      const resp = await fetch(`${ollamaSettings.url.replace(/\/+$/, '')}/api/tags`)
      if (resp.ok) {
        setOllamaTestResult('ok')
      } else {
        setOllamaTestResult('error')
      }
    } catch {
      setOllamaTestResult('error')
    }
  }, [ollamaSettings])

  const handleSaveOllamaSettings = useCallback(async () => {
    if (!ollamaSettings?.url || !ollamaSettings?.modelId) return
    setOllamaSaving(true)
    try {
      await saveOllamaSettings({ url: ollamaSettings.url, modelId: ollamaSettings.modelId })
      setOllamaSaving(false)
    } catch {
      setOllamaSaving(false)
    }
  }, [ollamaSettings])

  const handleClearOllamaSettings = useCallback(async () => {
    await deleteOllamaSettings()
    setOllamaSettings(null)
    setOllamaModels([])
    setOllamaTestResult(null)
  }, [])

  const handleDiscoverLmStudioModels = useCallback(async () => {
    if (!lmStudioSettings?.url) return
    setLmStudioDiscovering(true)
    setLmStudioTestResult(null)
    try {
      const models = await fetchLmStudioModels(lmStudioSettings.url)
      setLmStudioModels(models)
    } catch {
      setLmStudioModels([])
    }
    setLmStudioDiscovering(false)
  }, [lmStudioSettings])

  const handleTestLmStudio = useCallback(async () => {
    if (!lmStudioSettings?.url || !lmStudioSettings?.modelId) return
    setLmStudioTestResult(null)
    try {
      const resp = await fetch(`${lmStudioSettings.url.replace(/\/+$/, '')}/v1/models`)
      if (resp.ok) {
        setLmStudioTestResult('ok')
      } else {
        setLmStudioTestResult('error')
      }
    } catch {
      setLmStudioTestResult('error')
    }
  }, [lmStudioSettings])

  const handleSaveLmStudioSettings = useCallback(async () => {
    if (!lmStudioSettings?.url || !lmStudioSettings?.modelId) return
    setLmStudioSaving(true)
    try {
      await saveLmStudioSettings({ url: lmStudioSettings.url, modelId: lmStudioSettings.modelId })
      setLmStudioSaving(false)
    } catch {
      setLmStudioSaving(false)
    }
  }, [lmStudioSettings])

  const handleClearLmStudioSettings = useCallback(async () => {
    await deleteLmStudioSettings()
    setLmStudioSettings(null)
    setLmStudioModels([])
    setLmStudioTestResult(null)
  }, [])

  // v1.0.3: llama.cpp handlers

  // v1.0.4: vLLM handlers
  const handleDiscoverVllmModels = useCallback(async () => {
    if (!vllmSettings?.url) return
    setVllmDiscovering(true)
    try {
      const models = await fetchVllmModels(vllmSettings.url)
      setVllmModels(models)
    } catch {
      setVllmModels([])
    } finally {
      setVllmDiscovering(false)
    }
  }, [vllmSettings])

  const handleTestVllm = useCallback(async () => {
    if (!vllmSettings?.url || !vllmSettings?.modelId) return
    setVllmTestResult(null)
    try {
      const resp = await fetch(`${vllmSettings.url.replace(/\/+$/, '')}/v1/models`)
      if (resp.ok) {
        setVllmTestResult('ok')
      } else {
        setVllmTestResult('error')
      }
    } catch {
      setVllmTestResult('error')
    }
  }, [vllmSettings])

  const handleSaveVllmSettings = useCallback(async () => {
    if (!vllmSettings?.url || !vllmSettings?.modelId) return
    setVllmSaving(true)
    try {
      await saveVllmSettings({ url: vllmSettings.url, modelId: vllmSettings.modelId })
      setVllmTestResult('ok')
    } catch {
      setVllmTestResult('error')
    } finally {
      setVllmSaving(false)
    }
  }, [vllmSettings])

  const handleClearVllmSettings = useCallback(async () => {
    await deleteVllmSettings()
    setVllmSettings(null)
    setVllmModels([])
    setVllmTestResult(null)
  }, [])

  // v1.0.5: DeepSeek handlers
  const handleDiscoverDeepSeekModels = useCallback(async () => {
    if (!deepSeekSettings?.baseUrl || !deepSeekSettings?.apiKey) return
    setDeepSeekDiscovering(true)
    setDeepSeekTestResult(null)
    try {
      const models = await fetchDeepSeekModels(deepSeekSettings.baseUrl, deepSeekSettings.apiKey)
      setDeepSeekModels(models)
    } catch {
      setDeepSeekModels([])
    }
    setDeepSeekDiscovering(false)
  }, [deepSeekSettings])

  const handleTestDeepSeek = useCallback(async () => {
    if (!deepSeekSettings?.baseUrl || !deepSeekSettings?.apiKey) return
    setDeepSeekTestResult(null)
    try {
      const resp = await fetch(`${deepSeekSettings.baseUrl.replace(/\/+$/, '')}/v1/models`, {
        headers: { Authorization: `Bearer ${deepSeekSettings.apiKey}` },
      })
      if (resp.ok) {
        setDeepSeekTestResult('ok')
      } else {
        setDeepSeekTestResult('error')
      }
    } catch {
      setDeepSeekTestResult('error')
    }
  }, [deepSeekSettings])

  const handleSaveDeepSeekSettings = useCallback(async () => {
    if (!deepSeekSettings?.baseUrl || !deepSeekSettings?.apiKey || !deepSeekSettings?.modelId) return
    setDeepSeekSaving(true)
    try {
      await saveDeepSeekSettings({ baseUrl: deepSeekSettings.baseUrl, apiKey: deepSeekSettings.apiKey, modelId: deepSeekSettings.modelId })
      setDeepSeekSaving(false)
    } catch {
      setDeepSeekSaving(false)
    }
  }, [deepSeekSettings])

  const handleClearDeepSeekSettings = useCallback(async () => {
    await deleteDeepSeekSettings()
    setDeepSeekSettings(null)
    setDeepSeekModels([])
    setDeepSeekTestResult(null)
  }, [])

  // v1.0.7: SearXNG handlers
  const handleTestSearXNG = useCallback(async () => {
    if (!searxngSettings?.url) return
    setSearXngTestResult(null)
    try {
      const resp = await fetch(`${searxngSettings.url.replace(/\/+$/, '')}/search?q=test&format=json`)
      if (resp.ok) {
        setSearXngTestResult('ok')
      } else {
        setSearXngTestResult('error')
      }
    } catch {
      setSearXngTestResult('error')
    }
  }, [searxngSettings])

  const handleSaveSearXngSettings = useCallback(async () => {
    if (!searxngSettings?.url) return
    setSearXngSaving(true)
    try {
      await saveSearXngSettings({ url: searxngSettings.url })
      setSearXngSaving(false)
    } catch {
      setSearXngSaving(false)
    }
  }, [searxngSettings])

  const handleClearSearXngSettings = useCallback(async () => {
    await deleteSearXngSettings()
    setSearXngSettings(null)
    setSearXngTestResult(null)
  }, [])
  const handleDiscoverLlamaModels = useCallback(async () => {
    if (!llamaCppSettings?.url) return
    setLlamaCppDiscovering(true)
    setLlamaCppTestResult(null)
    try {
      const models = await (await import('../lib/llamaCppApi')).fetchLlamaModels(llamaCppSettings.url)
      setLlamaCppModels(models)
    } catch {
      setLlamaCppModels([])
    }
    setLlamaCppDiscovering(false)
  }, [llamaCppSettings])

  const handleTestLlama = useCallback(async () => {
    if (!llamaCppSettings?.url || !llamaCppSettings?.modelId) return
    setLlamaCppTestResult(null)
    try {
      const resp = await fetch(`${llamaCppSettings.url.replace(/\/+$/, '')}/v1/models`)
      if (resp.ok) {
        setLlamaCppTestResult('ok')
      } else {
        setLlamaCppTestResult('error')
      }
    } catch {
      setLlamaCppTestResult('error')
    }
  }, [llamaCppSettings])

  const handleSaveLlamaCppSettings = useCallback(async () => {
    if (!llamaCppSettings?.url || !llamaCppSettings?.modelId) return
    setLlamaCppSaving(true)
    try {
      await saveLlamaCppSettings({ url: llamaCppSettings.url, modelId: llamaCppSettings.modelId })
      setLlamaCppSaving(false)
    } catch {
      setLlamaCppSaving(false)
    }
  }, [llamaCppSettings])

  const handleClearLlamaCppSettings = useCallback(async () => {
    await deleteLlamaCppSettings()
    setLlamaCppSettings(null)
    setLlamaCppModels([])
    setLlamaCppTestResult(null)
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
                    className={`api-provider-btn ${provider === 'ollama' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('ollama')}
                    type="button"
                  >
                    Ollama
                  </button>
                  <button
                    className={`api-provider-btn ${provider === 'lmstudio' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('lmstudio')}
                    type="button"
                  >
                    LM Studio
                  </button>
                  <button
                    className={`api-provider-btn ${provider === 'llamacpp' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('llamacpp')}
                    type="button"
                  >
                    llama.cpp
                  </button>
                  <button
                    className={`api-provider-btn ${provider === 'vllm' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('vllm')}
                    type="button"
                  >
                    vLLM
                  </button>
                  <button
                    className={`api-provider-btn ${provider === 'deepseek' ? 'api-provider-btn--active' : ''}`}
                    onClick={() => onSetProvider('deepseek')}
                    type="button"
                  >
                    DeepSeek
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

            {provider === 'ollama' && (
              <>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('ollama.url')}
                  </label>
                  <input
                    type="text"
                    className="settings-input api-url-input"
                    placeholder={t('ollama.placeholderUrl')}
                    value={ollamaSettings?.url ?? ''}
                    onChange={(e) => setOllamaSettings(ollamaSettings ? { ...ollamaSettings, url: e.target.value } : { url: e.target.value, modelId: '' })}
                  />
                </div>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('ollama.discoverModels')}
                  </label>
                  <button
                    className="api-discover-btn"
                    onClick={handleDiscoverModels}
                    disabled={ollamaDiscovering || !ollamaSettings?.url}
                    type="button"
                  >
                    {ollamaDiscovering
                      ? t('openai.testing')
                      : t('ollama.discoverModels')}
                  </button>
                </div>
                {ollamaModels.length > 0 && (
                  <div className="settings-param">
                    <label className="settings-label">
                      {t('ollama.model')}
                    </label>
                    <select
                      className="settings-input api-model-select"
                      value={ollamaSettings?.modelId ?? ''}
                      onChange={(e) => setOllamaSettings(ollamaSettings ? { ...ollamaSettings, modelId: e.target.value } : { url: '', modelId: e.target.value })}
                    >
                      <option value="">— {t('ollama.noModels')} —</option>
                      {ollamaModels.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.details?.parameter_size ?? '?GB'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {ollamaModels.length === 0 && ollamaDiscovering === false && ollamaSettings?.url && (
                  <span className="api-status api-status-error">
                    {t('ollama.noModels')}
                  </span>
                )}
                <div className="api-actions">
                  <button
                    className="api-save-btn"
                    onClick={handleSaveOllamaSettings}
                    disabled={ollamaSaving || !ollamaSettings?.url || !ollamaSettings?.modelId}
                    type="button"
                  >
                    {ollamaSaving ? t('ollama.saved') : t('ollama.save')}
                  </button>
                  <button
                    className="api-test-btn"
                    onClick={handleTestOllama}
                    disabled={!ollamaSettings?.url || !ollamaSettings?.modelId}
                    type="button"
                  >
                    {t('ollama.testConnection')}
                  </button>
                  <button
                    className="api-clear-btn"
                    onClick={handleClearOllamaSettings}
                    type="button"
                  >
                    {t('ollama.clear')}
                  </button>
                </div>
                {ollamaTestResult === 'ok' && (
                  <span className="api-status api-status-ok">{t('ollama.connected')}</span>
                )}
                {ollamaTestResult === 'error' && (
                  <span className="api-status api-status-error">
                    {t('ollama.error')} — {t('ollama.corsHint')}
                  </span>
                )}
              </>
            )}

            {provider === 'lmstudio' && (
              <>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('lmstudio.url')}
                  </label>
                  <input
                    type="text"
                    className="settings-input api-url-input"
                    placeholder={t('lmstudio.placeholderUrl')}
                    value={lmStudioSettings?.url ?? ''}
                    onChange={(e) => setLmStudioSettings(lmStudioSettings ? { ...lmStudioSettings, url: e.target.value } : { url: e.target.value, modelId: '' })}
                  />
                </div>
                <div className="settings-param">
                  <label className="settings-label">
                    {t('lmstudio.discoverModels')}
                  </label>
                  <button
                    className="api-discover-btn"
                    onClick={handleDiscoverLmStudioModels}
                    disabled={lmStudioDiscovering || !lmStudioSettings?.url}
                    type="button"
                  >
                    {lmStudioDiscovering
                      ? t('openai.testing')
                      : t('lmstudio.discoverModels')}
                  </button>
                </div>
                {lmStudioModels.length > 0 && (
                  <div className="settings-param">
                    <label className="settings-label">
                      {t('lmstudio.model')}
                    </label>
                    <select
                      className="settings-input api-model-select"
                      value={lmStudioSettings?.modelId ?? ''}
                      onChange={(e) => setLmStudioSettings(lmStudioSettings ? { ...lmStudioSettings, modelId: e.target.value } : { url: '', modelId: e.target.value })}
                    >
                      <option value="">— {t('lmstudio.noModels')} —</option>
                      {lmStudioModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {lmStudioModels.length === 0 && lmStudioDiscovering === false && lmStudioSettings?.url && (
                  <span className="api-status api-status-error">
                    {t('lmstudio.noModels')}
                  </span>
                )}
                <div className="api-actions">
                  <button
                    className="api-save-btn"
                    onClick={handleSaveLmStudioSettings}
                    disabled={lmStudioSaving || !lmStudioSettings?.url || !lmStudioSettings?.modelId}
                    type="button"
                  >
                    {lmStudioSaving ? t('lmstudio.saved') : t('lmstudio.save')}
                  </button>
                  <button
                    className="api-test-btn"
                    onClick={handleTestLmStudio}
                    disabled={!lmStudioSettings?.url || !lmStudioSettings?.modelId}
                    type="button"
                  >
                    {t('lmstudio.testConnection')}
                  </button>
                  <button
                    className="api-clear-btn"
                    onClick={handleClearLmStudioSettings}
                    type="button"
                  >
                    {t('lmstudio.clear')}
                  </button>
                </div>
                {lmStudioTestResult === 'ok' && (
                  <span className="api-status api-status-ok">{t('lmstudio.connected')}</span>
                )}
                {lmStudioTestResult === 'error' && (
                  <span className="api-status api-status-error">
                    {t('lmstudio.error')} — {t('lmstudio.corsHint')}
                  </span>
                )}
              </>
            )}

            {/* v1.0.3: llama.cpp server settings */}
            {provider === 'llamacpp' && (
              <>
                <div className="settings-section-title">{t('llamaCpp.title')}</div>
                <div className="settings-section-desc">{t('llamaCpp.desc')}</div>
                <div className="settings-field">
                  <label>{t('llamaCpp.url')}</label>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder={t('llamaCpp.placeholderUrl')}
                    value={llamaCppSettings?.url ?? ''}
                    onChange={(e) => setLlamaCppSettings({ url: e.target.value, modelId: '' })}
                  />
                </div>
                <div className="settings-row">
                  <button
                    className="api-provider-btn"
                    onClick={handleDiscoverLlamaModels}
                    disabled={llamaCppDiscovering || !llamaCppSettings?.url}
                    type="button"
                  >
                    {llamaCppDiscovering
                      ? t('llamaCpp.discovering')
                      : t('llamaCpp.discoverModels')}
                  </button>
                </div>
                {llamaCppModels.length > 0 && (
                  <div className="settings-field">
                    <label>{t('llamaCpp.model')}</label>
                    <select
                      className="settings-select"
                      value={llamaCppSettings?.modelId ?? ''}
                      onChange={(e) => setLlamaCppSettings(llamaCppSettings ? { ...llamaCppSettings, modelId: e.target.value } : { url: '', modelId: e.target.value })}
                    >
                      <option value="">— {t('llamaCpp.noModels')} —</option>
                      {llamaCppModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name ?? m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {llamaCppModels.length === 0 && llamaCppDiscovering === false && llamaCppSettings?.url && (
                  <div className="settings-hint">{t('llamaCpp.noModels')}</div>
                )}
                <div className="settings-row">
                  <button
                    className="api-provider-btn"
                    onClick={handleSaveLlamaCppSettings}
                    disabled={llamaCppSaving || !llamaCppSettings?.url || !llamaCppSettings?.modelId}
                    type="button"
                  >
                    {llamaCppSaving ? t('llamaCpp.saved') : t('llamaCpp.save')}
                  </button>
                  <button
                    className="api-provider-btn"
                    onClick={handleTestLlama}
                    disabled={!llamaCppSettings?.url || !llamaCppSettings?.modelId}
                    type="button"
                  >
                    {t('llamaCpp.testConnection')}
                  </button>
                  <button
                    className="api-provider-btn"
                    onClick={handleClearLlamaCppSettings}
                    type="button"
                  >
                    {t('llamaCpp.clear')}
                  </button>
                </div>
                {llamaCppTestResult === 'ok' && (
                  <span className="api-status api-status-ok">{t('llamaCpp.connected')}</span>
                )}
                {llamaCppTestResult === 'error' && (
                  <span className="api-status api-status-error">
                    {t('llamaCpp.error')} — {t('llamaCpp.corsHint')}
                  </span>
                )}
              </>
            )}

            {/* v1.0.4: vLLM server settings */}
            {provider === 'vllm' && (
              <>
                <div className="settings-section-title">{t('vllm.title')}</div>
                <div className="settings-section-desc">{t('vllm.desc')}</div>
                <div className="settings-field">
                  <label>{t('vllm.url')}</label>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder={t('vllm.placeholderUrl')}
                    value={vllmSettings?.url ?? ''}
                    onChange={(e) => setVllmSettings({ url: e.target.value, modelId: '' })}
                  />
                </div>
                <div className="settings-row">
                  <button
                    className="api-provider-btn"
                    onClick={handleDiscoverVllmModels}
                    disabled={vllmDiscovering || !vllmSettings?.url}
                    type="button"
                  >
                    {vllmDiscovering
                      ? t('vllm.discovering')
                      : t('vllm.discoverModels')}
                  </button>
                </div>
                {vllmModels.length > 0 && (
                  <div className="settings-field">
                    <label>{t('vllm.model')}</label>
                    <select
                      className="settings-select"
                      value={vllmSettings?.modelId ?? ''}
                      onChange={(e) => setVllmSettings(vllmSettings ? { ...vllmSettings, modelId: e.target.value } : { url: '', modelId: e.target.value })}
                    >
                      <option value="">— {t('vllm.noModels')} —</option>
                      {vllmModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {vllmModels.length === 0 && vllmDiscovering === false && vllmSettings?.url && (
                  <div className="settings-hint">{t('vllm.noModels')}</div>
                )}
                <div className="settings-row">
                  <button
                    className="api-provider-btn"
                    onClick={handleSaveVllmSettings}
                    disabled={vllmSaving || !vllmSettings?.url || !vllmSettings?.modelId}
                    type="button"
                  >
                    {vllmSaving ? t('vllm.saved') : t('vllm.save')}
                  </button>
                  <button
                    className="api-provider-btn"
                    onClick={handleTestVllm}
                    disabled={!vllmSettings?.url || !vllmSettings?.modelId}
                    type="button"
                  >
                    {t('vllm.testConnection')}
                  </button>
                  <button
                    className="api-provider-btn"
                    onClick={handleClearVllmSettings}
                    type="button"
                  >
                    {t('vllm.clear')}
                  </button>
                </div>
                {vllmTestResult === 'ok' && (
                  <span className="api-status api-status-ok">{t('vllm.connected')}</span>
                )}
                {vllmTestResult === 'error' && (
                  <span className="api-status api-status-error">
                    {t('vllm.error')} — {t('vllm.corsHint')}
                  </span>
                )}
              </>
            )}

            {/* v1.0.5: DeepSeek cloud API settings */}
            {provider === 'deepseek' && (
              <>
                <div className="settings-section-title">{t('deepseek.title')}</div>
                <div className="settings-section-desc">{t('deepseek.desc')}</div>
                <div className="settings-field">
                  <label>{t('deepseek.baseUrl')}</label>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder={t('deepseek.placeholderUrl')}
                    value={deepSeekSettings?.baseUrl ?? ''}
                    onChange={(e) => setDeepSeekSettings({ baseUrl: e.target.value, apiKey: '', modelId: '' })}
                  />
                </div>
                <div className="settings-field">
                  <label>{t('deepseek.apiKey')}</label>
                  <input
                    type="password"
                    className="settings-input"
                    placeholder={t('deepseek.placeholderKey')}
                    value={deepSeekSettings?.apiKey ?? ''}
                    onChange={(e) => setDeepSeekSettings(deepSeekSettings ? { ...deepSeekSettings, apiKey: e.target.value } : { baseUrl: '', apiKey: e.target.value, modelId: '' })}
                  />
                </div>
                <div className="settings-row">
                  <button
                    className="api-provider-btn"
                    onClick={handleDiscoverDeepSeekModels}
                    disabled={deepSeekDiscovering || !deepSeekSettings?.baseUrl || !deepSeekSettings?.apiKey}
                    type="button"
                  >
                    {deepSeekDiscovering
                      ? t('deepseek.discovering')
                      : t('deepseek.discoverModels')}
                  </button>
                </div>
                {deepSeekModels.length > 0 && (
                  <div className="settings-field">
                    <label>{t('deepseek.model')}</label>
                    <select
                      className="settings-select"
                      value={deepSeekSettings?.modelId ?? ''}
                      onChange={(e) => setDeepSeekSettings(deepSeekSettings ? { ...deepSeekSettings, modelId: e.target.value } : { baseUrl: '', apiKey: '', modelId: e.target.value })}
                    >
                      <option value="">— {t('deepseek.noModels')} —</option>
                      {deepSeekModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {deepSeekModels.length === 0 && deepSeekDiscovering === false && deepSeekSettings?.baseUrl && deepSeekSettings?.apiKey && (
                  <div className="settings-hint">{t('deepseek.noModels')}</div>
                )}
                <div className="settings-row">
                  <button
                    className="api-provider-btn"
                    onClick={handleSaveDeepSeekSettings}
                    disabled={deepSeekSaving || !deepSeekSettings?.baseUrl || !deepSeekSettings?.apiKey || !deepSeekSettings?.modelId}
                    type="button"
                  >
                    {deepSeekSaving ? t('deepseek.saved') : t('deepseek.save')}
                  </button>
                  <button
                    className="api-provider-btn"
                    onClick={handleTestDeepSeek}
                    disabled={!deepSeekSettings?.baseUrl || !deepSeekSettings?.apiKey}
                    type="button"
                  >
                    {t('deepseek.testConnection')}
                  </button>
                  <button
                    className="api-provider-btn"
                    onClick={handleClearDeepSeekSettings}
                    type="button"
                  >
                    {t('deepseek.clear')}
                  </button>
                </div>
                {deepSeekTestResult === 'ok' && (
                  <span className="api-status api-status-ok">{t('deepseek.connected')}</span>
                )}
                {deepSeekTestResult === 'error' && (
                  <span className="api-status api-status-error">
                    {t('deepseek.error')}
                  </span>
                )}
              </>
            )}

            {/* v1.0.7: SearXNG web search settings */}
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-title">{t('searxng.title')}</span>
              </div>
              <p className="settings-hint">
                {t('searxng.desc')}
              </p>
              <div className="settings-field">
                <label>{t('searxng.url')}</label>
                <input
                  type="url"
                  className="settings-input"
                  placeholder={t('searxng.placeholderUrl')}
                  value={searxngSettings?.url ?? ''}
                  onChange={(e) => setSearXngSettings({ url: e.target.value })}
                />
              </div>
              <div className="settings-row">
                <button
                  className="api-provider-btn"
                  onClick={handleSaveSearXngSettings}
                  disabled={searxngSaving || !searxngSettings?.url}
                  type="button"
                >
                  {searxngSaving ? t('searxng.saved') : t('searxng.save')}
                </button>
                <button
                  className="api-provider-btn"
                  onClick={handleTestSearXNG}
                  disabled={!searxngSettings?.url}
                  type="button"
                >
                  {t('searxng.testConnection')}
                </button>
                <button
                  className="api-provider-btn"
                  onClick={handleClearSearXngSettings}
                  type="button"
                >
                  {t('searxng.clear')}
                </button>
              </div>
              {searxngTestResult === 'ok' && (
                <span className="api-status api-status-ok">{t('searxng.connected')}</span>
              )}
              {searxngTestResult === 'error' && (
                <span className="api-status api-status-error">
                  {t('searxng.error')} — {t('searxng.corsHint')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
