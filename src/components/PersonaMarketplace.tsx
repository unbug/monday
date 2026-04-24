import { useState, useCallback } from 'react'
import {
  PERSONA_REGISTRY,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
} from '../data/personaRegistry'
import type { MarketplacePersona } from '../data/personaRegistry'

interface Props {
  onBack: () => void
  onApplyPersona: (persona: MarketplacePersona) => void
}

export function PersonaMarketplace({ onBack, onApplyPersona }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
        <button className="persona-marketplace-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="persona-marketplace-title-area">
          <h2 className="persona-marketplace-title">Persona Marketplace</h2>
          <p className="persona-marketplace-subtitle">
            Browse community personas and apply them to your current session
          </p>
        </div>
      </div>

      {/* Category filter */}
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

      {/* Results */}
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
    </div>
  )
}
