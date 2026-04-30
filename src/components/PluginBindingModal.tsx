/**
 * PluginBindingModal — prompts to install missing plugins when installing a skill.
 *
 * Shown from SkillRegistry when a skill declares requiredPlugins.
 */

import { useState, useCallback, useEffect } from 'react'
import { getInstalledPlugins } from '../lib/pluginLoader'
import { t } from '../lib/i18n'

interface PluginBindingModalProps {
  skillName: string
  requiredPluginUrls: string[]
  onInstallAll: () => void
  onSkip: () => void
  onClose: () => void
}

interface MissingPlugin {
  url: string
  error: string | null
}

export function PluginBindingModal({
  skillName,
  requiredPluginUrls,
  onInstallAll,
  onSkip,
  onClose,
}: PluginBindingModalProps) {
  const [installedPlugins, setInstalledPlugins] = useState<Set<string>>(new Set())
  const [missing, setMissing] = useState<MissingPlugin[]>([])
  const [installing, setInstalling] = useState(false)

  // Load installed plugins on mount
  useEffect(() => {
    setInstalledPlugins(new Set(getInstalledPlugins().map((p) => p.id)))
  }, [])

  // Compute missing plugins (by ID lookup)
  useEffect(() => {
    const plugins = getInstalledPlugins()
    const pluginMap = new Map(plugins.map((p) => [p.id, p]))
    const result: MissingPlugin[] = []
    for (const url of requiredPluginUrls) {
      // Try to extract ID from URL (last path segment without extension)
      const parts = url.split('/')
      let id = parts[parts.length - 1]?.replace(/\.[^.]+$/, '') || ''
      // Also check if URL itself matches an installed plugin
      if (!pluginMap.has(id) && !plugins.some((p) => p.manifestUrl === url)) {
        result.push({ url, error: null })
      }
    }
    setMissing(result)
  }, [requiredPluginUrls])

  const handleInstall = useCallback(async (index: number) => {
    const target = missing[index]
    if (!target || installing) return
    setInstalling(true)
    try {
      const { loadPlugin } = await import('../lib/pluginLoader')
      await loadPlugin(target.url)
      setInstalledPlugins(new Set(getInstalledPlugins().map((p) => p.id)))
      // Check if this was the last missing plugin
      const remaining = getInstalledPlugins()
      const pluginMap = new Map(remaining.map((p) => [p.id, p]))
      const stillMissing = requiredPluginUrls.filter(
        (url) => !pluginMap.has(url.split('/').pop()?.replace(/\.[^.]+$/, '') || '') && !remaining.some((p) => p.manifestUrl === url),
      )
      if (stillMissing.length === 0) {
        onInstallAll()
      }
    } catch (err) {
      setMissing((prev) =>
        prev.map((m, i) => (i === index ? { ...m, error: err instanceof Error ? err.message : String(err) } : m)),
      )
    } finally {
      setInstalling(false)
    }
  }, [missing, installing, requiredPluginUrls, onInstallAll])

  const handleSkip = useCallback(() => {
    onSkip()
  }, [onSkip])

  return (
    <div className="plugin-binding-overlay" onClick={onClose}>
      <div className="plugin-binding-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plugin-binding-header">
          <div className="plugin-binding-icon">🔌</div>
          <h3 className="plugin-binding-title">
            {t('pluginBinding.title')}
          </h3>
          <p className="plugin-binding-skill-name">
            <strong>{skillName}</strong>
          </p>
        </div>

        {missing.length === 0 ? (
          <div className="plugin-binding-all-installed">
            <span className="plugin-binding-check">✓</span>
            <span>{t('pluginBinding.allInstalled')}</span>
          </div>
        ) : (
          <div className="plugin-binding-missing-list">
            <p className="plugin-binding-missing-label">
              {t('pluginBinding.missingLabel', { count: missing.length })}
            </p>
            {missing.map((item, index) => (
              <div key={index} className="plugin-binding-missing-item">
                <div className="plugin-binding-missing-url">
                  <span className="plugin-binding-missing-url-text">{item.url}</span>
                </div>
                {item.error && (
                  <div className="plugin-binding-missing-error">
                    {item.error}
                  </div>
                )}
                <button
                  className="plugin-binding-install-btn"
                  onClick={() => handleInstall(index)}
                  disabled={installing}
                >
                  {installing ? '⏳ Installing…' : '🔌 Install'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="plugin-binding-actions">
          <button
            className="plugin-binding-skip-btn"
            onClick={handleSkip}
          >
            {t('pluginBinding.skip')}
          </button>
        </div>
      </div>
    </div>
  )
}
