import { useState, useRef, useCallback, useEffect } from 'react'
import { t } from '../lib/i18n'

export type ProviderType =
  | 'web-llm'
  | 'openai'
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'vllm'
  | 'deepseek'
  | null

interface Props {
  provider: ProviderType
  onChange: (provider: ProviderType) => void
}

export const PROVIDERS: Array<{
  id: ProviderType
  label: string
  icon: string
  desc: string
}> = [
  { id: 'web-llm', label: t('provider.local'), icon: '🧠', desc: t('provider.localDesc') },
  { id: 'openai', label: 'OpenAI', icon: '🌐', desc: t('provider.remoteDesc') },
  { id: 'ollama', label: 'Ollama', icon: '🦙', desc: t('provider.remoteDesc') },
  { id: 'lmstudio', label: 'LM Studio', icon: '🏠', desc: t('provider.remoteDesc') },
  { id: 'llamacpp', label: 'llama.cpp', icon: '🔥', desc: t('provider.remoteDesc') },
  { id: 'vllm', label: 'vLLM', icon: '⚡', desc: t('provider.remoteDesc') },
  { id: 'deepseek', label: 'DeepSeek', icon: '🔮', desc: t('provider.remoteDesc') },
]

function getProviderLabel(provider: ProviderType): string {
  if (!provider) return t('provider.local')
  const found = PROVIDERS.find((p) => p.id === provider)
  return found?.label ?? provider
}

function getProviderIcon(provider: ProviderType): string {
  if (!provider) return '🧠'
  const found = PROVIDERS.find((p) => p.id === provider)
  return found?.icon ?? '🧠'
}

function isLocalProvider(provider: ProviderType): boolean {
  return provider === null || provider === 'web-llm'
}

export function ProviderSwitcher({ provider, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = useCallback(() => {
    setOpen((v) => !v)
  }, [])

  const handleSelect = useCallback(
    (id: ProviderType) => {
      onChange(id)
      setOpen(false)
    },
    [onChange],
  )

  return (
    <div className="provider-switcher" ref={ref}>
      <button
        className={`provider-switcher-btn ${open ? 'provider-switcher-btn--open' : ''}`}
        onClick={handleToggle}
        type="button"
        title={t('provider.title')}
      >
        <span className="provider-switcher-icon">{getProviderIcon(provider)}</span>
        <span className="provider-switcher-label">{getProviderLabel(provider)}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`provider-switcher-chevron ${open ? 'provider-switcher-chevron--open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="provider-switcher-dropdown">
          <div className="provider-switcher-group-label">{t('provider.groupLocal')}</div>
          {PROVIDERS.filter((p) => isLocalProvider(p.id)).map((p) => (
            <button
              key={p.id ?? 'local'}
              className={`provider-switcher-option ${provider === p.id ? 'provider-switcher-option--active' : ''} provider-switcher-option--local`}
              onClick={() => handleSelect(p.id)}
              type="button"
            >
              <span className="provider-switcher-option-icon">{p.icon}</span>
              <span className="provider-switcher-option-label">{p.label}</span>
              <span className="provider-switcher-option-desc">{p.desc}</span>
              {provider === p.id && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="provider-switcher-check"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}

          <div className="provider-switcher-group-label">{t('provider.groupRemote')}</div>
          {PROVIDERS.filter((p) => !isLocalProvider(p.id)).map((p) => (
            <button
              key={p.id}
              className={`provider-switcher-option ${provider === p.id ? 'provider-switcher-option--active' : ''} provider-switcher-option--remote`}
              onClick={() => handleSelect(p.id)}
              type="button"
            >
              <span className="provider-switcher-option-icon">{p.icon}</span>
              <span className="provider-switcher-option-label">{p.label}</span>
              <span className="provider-switcher-option-desc">{p.desc}</span>
              {provider === p.id && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="provider-switcher-check"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
