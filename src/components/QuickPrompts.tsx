import { useState, useMemo, useCallback } from 'react'
import type { PromptTemplate, CustomPersona } from '../lib/prompts'
import {
  PROMPT_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_PERSONA,
} from '../lib/prompts'
import { getCustomPersonas, deleteCustomPersona } from '../lib/personas'

interface Props {
  activePersonaId: string | null
  onApplyPersona: (persona: PromptTemplate) => void
  onClearPersona: () => void
}

export function QuickPrompts({
  activePersonaId,
  onApplyPersona,
  onClearPersona,
}: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [editingPersona, setEditingPersona] = useState<CustomPersona | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const customPersonas = useMemo(() => getCustomPersonas(), [])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    PROMPT_TEMPLATES.forEach((p) => cats.add(p.category))
    if (customPersonas.length > 0) cats.add('custom')
    return [...cats]
  }, [customPersonas])

  const allPersonas = useMemo(() => {
    const list = [...PROMPT_TEMPLATES]
    if (customPersonas.length > 0) {
      list.push(
        ...customPersonas.map((p) => ({
          ...p,
          systemPrompt: p.systemPrompt,
          builtin: true as const,
        })) as unknown as PromptTemplate[],
      )
    }
    return list
  }, [customPersonas])

  const filtered = useMemo(() => {
    let list = allPersonas
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    }
    return list
  }, [allPersonas, activeCategory, search])

  const handleApply = useCallback(
    (persona: PromptTemplate) => {
      onApplyPersona(persona)
    },
    [onApplyPersona],
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteCustomPersona(id)
      setEditingPersona(null)
    },
    [],
  )

  return (
    <div className="quick-prompts">
      <div className="quick-prompts-header">
        <h3 className="quick-prompts-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Personas
        </h3>
        <button
          className="quick-prompts-create-btn"
          onClick={() => setShowCreate(true)}
          title="Create custom persona"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {search.trim() ? (
        <input
          className="quick-prompts-search"
          type="text"
          placeholder="Search personas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      ) : (
        <div className="quick-prompts-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`quick-prompts-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() =>
                setActiveCategory(activeCategory === cat ? null : cat)
              }
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      <div className="quick-prompts-list">
        {filtered.length === 0 && (
          <p className="quick-prompts-empty">No personas found</p>
        )}
        {filtered.map((persona) => {
          const isActive = activePersonaId === persona.id
          const isCustom = !PROMPT_TEMPLATES.find((p) => p.id === persona.id)

          return (
            <div
              key={persona.id}
              className={`quick-prompt-card ${isActive ? 'active' : ''}`}
            >
              <button
                className="quick-prompt-card-btn"
                onClick={() => handleApply(persona)}
              >
                <span className="quick-prompt-icon">{persona.icon}</span>
                <div className="quick-prompt-info">
                  <span className="quick-prompt-name">{persona.name}</span>
                  <span className="quick-prompt-desc">{persona.description}</span>
                </div>
                {isActive && (
                  <span className="quick-prompt-active-dot" />
                )}
              </button>
              {isCustom && (
                <div className="quick-prompt-card-actions">
                  <button
                    className="quick-prompt-action-btn"
                    onClick={() => setEditingPersona(persona as unknown as CustomPersona)}
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="quick-prompt-action-btn quick-prompt-delete"
                    onClick={() => handleDelete(persona.id)}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activePersonaId && (
        <button
          className="quick-prompts-clear"
          onClick={onClearPersona}
        >
          Clear Persona
        </button>
      )}

      {/* Create/Edit Persona Modal */}
      {(showCreate || editingPersona) && (
        <PersonaForm
          persona={editingPersona}
          onSave={(p) => {
            if (editingPersona) {
              // Update existing
              deleteCustomPersona(editingPersona.id)
            }
            // Save will be handled by parent
            setShowCreate(false)
            setEditingPersona(null)
          }}
          onClose={() => {
            setShowCreate(false)
            setEditingPersona(null)
          }}
        />
      )}
    </div>
  )
}

interface PersonaFormProps {
  persona: CustomPersona | null
  onSave: (persona: CustomPersona) => void
  onClose: () => void
}

function PersonaForm({ persona, onSave, onClose }: PersonaFormProps) {
  const [name, setName] = useState(persona?.name ?? '')
  const [description, setDescription] = useState(persona?.description ?? '')
  const [icon, setIcon] = useState(persona?.icon ?? '⭐')
  const [systemPrompt, setSystemPrompt] = useState(persona?.systemPrompt ?? '')
  const [category, setCategory] = useState<'coding' | 'writing' | 'translation' | 'education' | 'general'>('general')

  const icons = ['🤖', '💻', '🔍', '🌐', '📚', '✍️', '💡', '⚔️', '📋', '⭐', '🎯', '🧪', '🎨', '📊']

  const handleSave = () => {
    if (!name.trim() || !systemPrompt.trim()) return
    onSave({
      id: persona?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || 'Custom persona',
      icon,
      systemPrompt: systemPrompt.trim(),
      category: 'custom',
      builtin: false,
      createdAt: persona?.createdAt ?? Date.now(),
    })
  }

  return (
    <div className="persona-form-overlay" onClick={onClose}>
      <div className="persona-form" onClick={(e) => e.stopPropagation()}>
        <h3 className="persona-form-title">
          {persona ? 'Edit Persona' : 'New Persona'}
        </h3>

        <div className="persona-form-row">
          <label>Icon</label>
          <div className="persona-form-icons">
            {icons.map((i) => (
              <button
                key={i}
                className={`persona-form-icon-btn ${icon === i ? 'active' : ''}`}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="persona-form-row">
          <label>Name</label>
          <input
            className="persona-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Persona name"
            autoFocus
          />
        </div>

        <div className="persona-form-row">
          <label>Description</label>
          <input
            className="persona-form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this persona do?"
          />
        </div>

        <div className="persona-form-row">
          <label>System Prompt</label>
          <textarea
            className="persona-form-textarea"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Define the persona's behavior..."
            rows={6}
          />
        </div>

        <div className="persona-form-actions">
          <button className="persona-form-btn persona-form-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="persona-form-btn persona-form-save"
            onClick={handleSave}
            disabled={!name.trim() || !systemPrompt.trim()}
          >
            {persona ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
