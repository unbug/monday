/**
 * PersonaMarketplace — Browse, publish, and preview personas.
 * Includes a "Memory" tab that shows which memories each persona can read.
 */

import { useState, useCallback } from 'react'
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

interface Props {
  onBack: () => void
  onApplyPersona: (persona: MarketplacePersona) => void
  memories?: MemoryEntry[]
  personas?: MarketplacePersona[]
}

const TABS = ['browse', 'publish', 'memory'] as const
type Tab = (typeof TABS)[number]

export function PersonaMarketplace({ onBack, onApplyPersona, memories = [], personas = [] }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('browse')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPersona, setSelectedPersona] = useState<MarketplacePersona | null>(null)

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

  const handleApply = useCallback(
    (persona: MarketplacePersona) => {
      onApplyPersona(persona)
      onBack()
    },
    [onApplyPersona, onBack],
  )

  return (
    <div className="persona-marketplace">
      <div className="persona-marketplace-header">
        <div className="persona-marketplace-title-area">
          <h2 className="persona-marketplace-title">Persona Marketplace</h2>
          <p className="persona-marketplace-subtitle">
            {activeTab === 'browse'
              ? 'Browse community personas and apply them to your current session'
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

          {/* Search */}
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
        </>
      )}

      {/* Browse personas */}
      {activeTab === 'browse' ? (
        <div className="persona-marketplace-grid">
          {filtered.length === 0 ? (
            <div className="persona-marketplace-empty">
              No personas found{" "}
              {searchQuery ? `for "${searchQuery}"` : 'in this category'}
            </div>
          ) : (
            filtered.map((persona) => (
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
                <div className="persona-marketplace-card-actions">
                  <button
                    className="persona-marketplace-apply-btn"
                    onClick={() => handleApply(persona)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))
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
    </div>
  )
}
