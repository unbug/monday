/**
 * PersonaMarketplace — Browse, install, and preview personas.
 * Includes a "Memory" tab that shows which memories each persona can read.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  PERSONA_REGISTRY,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
} from '../data/personaRegistry'
import type { MarketplacePersona } from '../data/personaRegistry'
import { PersonaPublish } from './PersonaPublish'
import { MemoryPreviewPanel } from './MemoryPreviewPanel'
import type { MemoryEntry } from '../types'
import { t } from '../lib/i18n'
import {
  installPersona,
  uninstallPersona,
  loadInstalledPersonas,
  isPersonaInstalled,
  type InstalledPersona,
} from '../lib/storage'

interface Props {
  onBack: () => void
  onApplyPersona: (persona: MarketplacePersona) => void
  memories?: MemoryEntry[]
  personas?: MarketplacePersona[]
}

const TABS = ['browse', 'publish', 'memory'] as const
type Tab = (typeof TABS)[number]

type SortMode = 'default' | 'installs' | 'alpha'

export function PersonaMarketplace({ onBack, onApplyPersona, memories = [], personas = [] }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('browse')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPersona, setSelectedPersona] = useState<MarketplacePersona | null>(null)
  const [sortBy, setSortBy] = useState<SortMode>('default')
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [installCounts, setInstallCounts] = useState<Map<string, number>>(new Map())
  const [previewPersona, setPreviewPersona] = useState<MarketplacePersona | null>(null)
  const [isInstalling, setIsInstalling] = useState<string | null>(null)

  // Load installed personas on mount
  useEffect(() => {
    loadInstalledPersonas().then((list) => {
      const ids = new Set(list.map((p) => p.id))
      const counts = new Map(list.map((p) => [p.id, p.installCount]))
      setInstalledIds(ids)
      setInstallCounts(counts)
    })
  }, [])

  const filtered = PERSONA_REGISTRY.filter((persona) => {
    if (activeCategory !== 'all' && persona.category !== activeCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        persona.name.toLowerCase().includes(q) ||
        persona.description.toLowerCase().includes(q) ||
        persona.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'installs') {
      return (installCounts.get(b.id) ?? 0) - (installCounts.get(a.id) ?? 0)
    }
    if (sortBy === 'alpha') {
      return a.name.localeCompare(b.name)
    }
    return 0
  })

  const handleApply = useCallback(
    (persona: MarketplacePersona) => {
      onApplyPersona(persona)
      onBack()
    },
    [onApplyPersona, onBack],
  )

  const handleInstall = useCallback(
    async (persona: MarketplacePersona) => {
      setIsInstalling(persona.id)
      try {
        await installPersona(persona.id)
        const newCount = (installCounts.get(persona.id) ?? 0) + 1
        setInstallCounts((prev) => new Map(prev).set(persona.id, newCount))
        setInstalledIds((prev) => new Set(prev).add(persona.id))
      } finally {
        setIsInstalling(null)
      }
    },
    [installCounts],
  )

  const handleUninstall = useCallback(
    async (persona: MarketplacePersona) => {
      setIsInstalling(persona.id)
      try {
        await uninstallPersona(persona.id)
        setInstalledIds((prev) => {
          const next = new Set(prev)
          next.delete(persona.id)
          return next
        })
        setInstallCounts((prev) => {
          const next = new Map(prev)
          next.delete(persona.id)
          return next
        })
      } finally {
        setIsInstalling(null)
      }
    },
    [],
  )

  const previewSnippet = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen) + '…'
  }

  return (
    <div className="persona-marketplace">
      <div className="persona-marketplace-header">
        <div className="persona-marketplace-title-area">
          <h2 className="persona-marketplace-title">Persona Marketplace</h2>
          <p className="persona-marketplace-subtitle">
            {activeTab === 'browse'
              ? 'Browse community personas and install them to your local store'
              : activeTab === 'publish'
                ? 'Create and share your own persona with the community'
                : 'Preview which memories each persona can read'}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="persona-marketplace-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`persona-marketplace-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              if (tab === 'memory') {
                setSelectedPersona(null)
              }
              setActiveTab(tab)
            }}
          >
            {tab === 'browse' ? '🌟 Browse' : tab === 'publish' ? '✏️ Publish' : '🧠 Memory'}
          </button>
        ))}
      </div>

      {/* Category filter (browse only) */}
      {activeTab === 'browse' && (
        <>
          <div className="persona-marketplace-categories">
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`persona-marketplace-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {MARKETPLACE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="persona-marketplace-search-row">
            <div className="persona-marketplace-search">
              <svg
                className="persona-marketplace-search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="persona-marketplace-search-input"
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="persona-marketplace-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <div className="persona-marketplace-sort">
              <select
                className="persona-marketplace-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
              >
                <option value="default">Sort: Default</option>
                <option value="installs">Sort: Install Count</option>
                <option value="alpha">Sort: A → Z</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Browse personas */}
      {activeTab === 'browse' ? (
        <div className="persona-marketplace-grid">
          {sorted.length === 0 ? (
            <div className="persona-marketplace-empty">
              No personas found{" "}
              {searchQuery ? `for "${searchQuery}"` : 'in this category'}
            </div>
          ) : (
            sorted.map((persona) => {
              const isInstalled = installedIds.has(persona.id)
              const installCount = installCounts.get(persona.id) ?? 0
              const isInstallingHere = isInstalling === persona.id

              return (
                <div key={persona.id} className="persona-marketplace-card">
                  <div className="persona-marketplace-card-header">
                    <span className="persona-marketplace-card-icon">{persona.icon}</span>
                    <div className="persona-marketplace-card-info">
                      <h3 className="persona-marketplace-card-name">{persona.name}</h3>
                      <span className="persona-marketplace-card-category">
                        {MARKETPLACE_CATEGORY_LABELS[persona.category]?.replace(/^.\s*/, '')}
                      </span>
                    </div>
                  </div>
                  <p className="persona-marketplace-card-desc">{persona.description}</p>
                  <div className="persona-marketplace-card-tags">
                    {persona.tags.map((tag) => (
                      <span key={tag} className="persona-marketplace-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="persona-marketplace-card-meta">
                    <span className="persona-marketplace-install-count">
                      📥 {installCount} {installCount === 1 ? 'install' : 'installs'}
                    </span>
                  </div>
                  <div className="persona-marketplace-card-actions">
                    {isInstalled ? (
                      <>
                        <button
                          className="persona-marketplace-apply-btn"
                          onClick={() => handleApply(persona)}
                        >
                          ▶ Apply
                        </button>
                        <button
                          className="persona-marketplace-uninstall-btn"
                          onClick={() => handleUninstall(persona)}
                          disabled={isInstallingHere}
                        >
                          {isInstallingHere ? '…' : '✕ Remove'}
                        </button>
                      </>
                    ) : (
                      <button
                        className="persona-marketplace-install-btn"
                        onClick={() => handleInstall(persona)}
                        disabled={isInstallingHere}
                      >
                        {isInstallingHere ? '⏳' : '📥 Install'}
                      </button>
                    )}
                    <button
                      className="persona-marketplace-preview-btn"
                      onClick={() => setPreviewPersona(persona)}
                      title="Preview persona details"
                    >
                      👁
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : activeTab === 'publish' ? (
        <PersonaPublish />
      ) : (
        /* Memory tab */
        <div className="persona-marketplace-memory">
          <div className="persona-marketplace-memory-grid">
            {/* Persona list */}
            <div className="persona-marketplace-memory-people">
              <h3 className="persona-marketplace-memory-title">{t('memory.personas')}</h3>
              <div className="persona-marketplace-memory-list">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    className={`persona-marketplace-memory-persona ${selectedPersona?.id === persona.id ? 'active' : ''}`}
                    onClick={() => setSelectedPersona(persona)}
                  >
                    <span className="persona-marketplace-memory-persona-icon">{persona.icon}</span>
                    <span className="persona-marketplace-memory-persona-name">{persona.name}</span>
                    {persona.readNamespaces && persona.readNamespaces.length > 0 && (
                      <span className="persona-marketplace-memory-ns-count">
                        {persona.readNamespaces.length}
                      </span>
                    )}
                  </button>
                ))}
                {personas.length === 0 && (
                  <div className="persona-marketplace-memory-empty">
                    {t('memory.noPersonas')}
                  </div>
                )}
              </div>
            </div>

            {/* Memory preview */}
            <div className="persona-marketplace-memory-preview">
              <MemoryPreviewPanel
                persona={selectedPersona}
                memories={memories}
                personas={personas}
                onClose={() => setSelectedPersona(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Persona Preview Modal */}
      {previewPersona && (
        <div className="persona-preview-overlay" onClick={() => setPreviewPersona(null)}>
          <div className="persona-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="persona-preview-header">
              <div className="persona-preview-title-area">
                <span className="persona-preview-icon">{previewPersona.icon}</span>
                <h3 className="persona-preview-title">{previewPersona.name}</h3>
              </div>
              <button
                className="persona-preview-close-btn"
                onClick={() => setPreviewPersona(null)}
              >
                ✕
              </button>
            </div>
            <div className="persona-preview-body">
              <p className="persona-preview-desc">{previewPersona.description}</p>

              <div className="persona-preview-section">
                <h4 className="persona-preview-section-title">System Prompt</h4>
                <div className="persona-preview-code">
                  {previewSnippet(previewPersona.systemPrompt, 500)}
                </div>
                {previewPersona.systemPrompt.length > 500 && (
                  <span className="persona-preview-truncated">
                    ({previewPersona.systemPrompt.length} chars total)
                  </span>
                )}
              </div>

              {previewPersona.soul && (
                <div className="persona-preview-section">
                  <h4 className="persona-preview-section-title">Soul (Identity)</h4>
                  <div className="persona-preview-soul">
                    {previewSnippet(previewPersona.soul, 300)}
                  </div>
                </div>
              )}

              {(previewPersona.draftModelId || previewPersona.refineModelId) && (
                <div className="persona-preview-section">
                  <h4 className="persona-preview-section-title">Model Parameters</h4>
                  <div className="persona-preview-params">
                    {previewPersona.draftModelId && (
                      <div className="persona-preview-param">
                        <span className="persona-preview-param-label">Draft:</span>
                        <span className="persona-preview-param-value">{previewPersona.draftModelId}</span>
                      </div>
                    )}
                    {previewPersona.refineModelId && (
                      <div className="persona-preview-param">
                        <span className="persona-preview-param-label">Refine:</span>
                        <span className="persona-preview-param-value">{previewPersona.refineModelId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {previewPersona.tags.length > 0 && (
                <div className="persona-preview-section">
                  <h4 className="persona-preview-section-title">Tags</h4>
                  <div className="persona-preview-tags">
                    {previewPersona.tags.map((tag) => (
                      <span key={tag} className="persona-preview-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {previewPersona.readNamespaces && previewPersona.readNamespaces.length > 0 && (
                <div className="persona-preview-section">
                  <h4 className="persona-preview-section-title">Memory Namespaces</h4>
                  <div className="persona-preview-ns-list">
                    {previewPersona.readNamespaces.map((ns) => (
                      <span
                        key={ns}
                        className={`persona-preview-ns-chip persona-preview-ns-${ns}`}
                      >
                        {ns}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="persona-preview-footer">
              {installedIds.has(previewPersona.id) ? (
                <button
                  className="persona-marketplace-apply-btn"
                  onClick={() => {
                    handleApply(previewPersona)
                    setPreviewPersona(null)
                  }}
                >
                  ▶ Apply to Session
                </button>
              ) : (
                <button
                  className="persona-marketplace-install-btn"
                  onClick={() => {
                    handleInstall(previewPersona)
                    setPreviewPersona(null)
                  }}
                >
                  📥 Install & Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
