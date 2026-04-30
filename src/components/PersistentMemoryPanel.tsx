/**
 * PersistentMemoryPanel — Cross-session memory management for v1.2.
 *
 * Displays all persistent memories (key-value entries) with edit/delete
 * capabilities. Memories are scoped to namespaces: global, persona, or skill.
 */

import { useState } from 'react'
import type { MemoryEntry } from '../types'
import type { MarketplacePersona } from '../data/personaRegistry'
import type { Skill } from '../types'
import { t } from '../lib/i18n'

interface PersistentMemoryPanelProps {
  memories: MemoryEntry[]
  personas: MarketplacePersona[]
  skills: Skill[]
  onAdd: (key: string, value: string, namespace: MemoryEntry['namespace'], targetId: string | null) => void
  onEdit: (id: string, key: string, value: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return t('memory.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('memory.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('memory.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('memory.daysAgo', { count: days })
}

function namespaceLabel(ns: MemoryEntry['namespace']): string {
  switch (ns) {
    case 'global': return t('memory.namespaceGlobal')
    case 'persona': return t('memory.namespacePersona')
    case 'skill': return t('memory.namespaceSkill')
  }
}

function namespaceColor(ns: MemoryEntry['namespace']): string {
  switch (ns) {
    case 'global': return 'var(--accent-color)'
    case 'persona': return '#f59e0b'
    case 'skill': return '#10b981'
  }
}

function targetLabel(memory: MemoryEntry, personas: MarketplacePersona[], skills: Skill[]): string | null {
  if (memory.namespace === 'persona') {
    return personas.find((p) => p.id === memory.targetId)?.name ?? memory.targetId
  }
  if (memory.namespace === 'skill') {
    return skills.find((s) => s.id === memory.targetId)?.name ?? memory.targetId
  }
  return null
}

export function PersistentMemoryPanel({
  memories,
  personas,
  skills,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: PersistentMemoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKey, setEditKey] = useState('')
  const [editValue, setEditValue] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'all' | 'global' | 'persona' | 'skill' | 'correction'>('all')
  const [newNamespace, setNewNamespace] = useState<MemoryEntry['namespace']>('global')
  const [personaTarget, setPersonaTarget] = useState('')
  const [skillTarget, setSkillTarget] = useState('')

  const filtered = filter === 'all' ? memories : memories.filter((m) => m.namespace === filter)

  const handleAdd = () => {
    if (newKey.trim() && newValue.trim()) {
      let targetId: string | null = null
      if (newNamespace === 'persona' && personaTarget) {
        targetId = personaTarget
      } else if (newNamespace === 'skill' && skillTarget) {
        targetId = skillTarget
      }
      onAdd(newKey.trim(), newValue.trim(), newNamespace, targetId)
      setNewKey('')
      setNewValue('')
      setNewNamespace('global')
      setPersonaTarget('')
      setSkillTarget('')
      setShowAdd(false)
    }
  }

  const handleSaveEdit = () => {
    if (editingId && editKey.trim()) {
      onEdit(editingId, editKey.trim(), editValue.trim())
      setEditingId(null)
      setEditKey('')
      setEditValue('')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditKey('')
    setEditValue('')
  }

  const handleDelete = (id: string) => {
    if (window.confirm(t('memory.confirmDelete'))) {
      onDelete(id)
    }
  }

  const personaOptions = personas.filter((p) => p.id !== 'default')

  return (
    <div className="persistent-memory-panel">
      {/* Header */}
      <div className="persistent-memory-header">
        <div className="persistent-memory-title-row">
          <h3>{t('memory.title')}</h3>
          <button className="persistent-memory-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="persistent-memory-subtitle">{t('memory.subtitle')}</p>
      </div>

      {/* Filter tabs */}
      <div className="persistent-memory-filters">
        {(['all', 'global', 'persona', 'skill', 'correction'] as const).map((ns) => (
          <button
            key={ns}
            className={`persistent-memory-filter ${filter === ns ? 'active' : ''}`}
            onClick={() => setFilter(ns)}
          >
            {ns === 'all' ? t('memory.all') : ns === 'correction' ? t('memory.corrections') : namespaceLabel(ns)}
            <span className="persistent-memory-count">
              {ns === 'all' ? memories.length : ns === 'correction' ? memories.filter((m) => m.source === 'correction').length : memories.filter((m) => m.namespace === ns).length}
            </span>
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        className="persistent-memory-add-btn"
        onClick={() => setShowAdd(!showAdd)}
      >
        {showAdd ? '✕ Cancel' : `+ ${t('memory.addNew')}`}
      </button>

      {/* Add form */}
      {showAdd && (
        <div className="persistent-memory-add-form">
          {/* Namespace selector */}
          <div className="persistent-memory-ns-selector">
            <label className="persistent-memory-ns-label">{t('memory.namespace')}:</label>
            <select
              className="persistent-memory-ns-select"
              value={newNamespace}
              onChange={(e) => setNewNamespace(e.target.value as MemoryEntry['namespace'])}
            >
              <option value="global">{t('memory.namespaceGlobal')}</option>
              <option value="persona">{t('memory.namespacePersona')}</option>
              <option value="skill">{t('memory.namespaceSkill')}</option>
            </select>
          </div>

          {/* Persona target selector */}
          {newNamespace === 'persona' && personaOptions.length > 0 && (
            <div className="persistent-memory-target-selector">
              <label className="persistent-memory-target-label">{t('memory.targetPersona')}:</label>
              <select
                className="persistent-memory-target-select"
                value={personaTarget}
                onChange={(e) => setPersonaTarget(e.target.value)}
              >
                <option value="">{t('memory.selectPersona')}</option>
                {personaOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Skill target selector */}
          {newNamespace === 'skill' && skills.length > 0 && (
            <div className="persistent-memory-target-selector">
              <label className="persistent-memory-target-label">{t('memory.targetSkill')}:</label>
              <select
                className="persistent-memory-target-select"
                value={skillTarget}
                onChange={(e) => setSkillTarget(e.target.value)}
              >
                <option value="">{t('memory.selectSkill')}</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <input
            className="persistent-memory-input"
            type="text"
            placeholder={t('memory.keyPlaceholder')}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            autoFocus
          />
          <textarea
            className="persistent-memory-textarea"
            placeholder={t('memory.valuePlaceholder')}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            rows={4}
          />
          <div className="persistent-memory-add-actions">
            <button className="persistent-memory-save-btn" onClick={handleAdd}>
              {t('memory.save')}
            </button>
            <button className="persistent-memory-cancel-btn" onClick={() => setShowAdd(false)}>
              {t('memory.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Memories list */}
      <div className="persistent-memory-list">
        {filtered.length === 0 ? (
          <div className="persistent-memory-empty">
            <span className="persistent-memory-empty-icon">🧠</span>
            <p>{t('memory.empty')}</p>
            <span className="persistent-memory-empty-hint">
              {t('memory.emptyHint')}
            </span>
          </div>
        ) : (
          filtered.map((memory) => {
            const targetName = targetLabel(memory, personas, skills)
            const isCorrection = memory.source === 'correction'
            return (
              <div key={memory.id} className={`persistent-memory-card ${isCorrection ? 'persistent-memory-card-correction' : ''}`}>
                <div className="persistent-memory-card-header">
                  {isCorrection && (
                    <span className="persistent-memory-correction-badge">
                      {memory.key.includes('edit') ? t('memory.correctionEdit') : t('memory.correctionRegen')}
                    </span>
                  )}
                  <span className="persistent-memory-key">
                    {editingId === memory.id ? (
                      <input
                        className="persistent-memory-edit-key"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      memory.key
                    )}
                  </span>
                  <span
                    className="persistent-memory-namespace-badge"
                    style={{ borderColor: namespaceColor(memory.namespace) }}
                  >
                    {namespaceLabel(memory.namespace)}
                  </span>
                </div>

                {targetName && (
                  <div className="persistent-memory-target-chip">
                    → {targetName}
                  </div>
                )}

                {editingId === memory.id ? (
                  <div className="persistent-memory-edit-area">
                    <textarea
                      className="persistent-memory-edit-textarea"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                    />
                    <div className="persistent-memory-edit-actions">
                      <button className="persistent-memory-save-btn" onClick={handleSaveEdit}>
                        {t('memory.save')}
                      </button>
                      <button className="persistent-memory-discard-btn" onClick={handleCancelEdit}>
                        {t('memory.discard')}
                      </button>
                      <button
                        className="persistent-memory-delete-btn"
                        onClick={() => handleDelete(memory.id)}
                      >
                        {t('memory.delete')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="persistent-memory-content"
                      onClick={() => {
                        setEditingId(memory.id)
                        setEditKey(memory.key)
                        setEditValue(memory.value)
                      }}
                      title={t('memory.clickToEdit')}
                    >
                      {memory.value.length > 400
                        ? memory.value.slice(0, 400) + '…'
                        : memory.value}
                    </div>
                    <div className="persistent-memory-meta">
                      <span className="persistent-memory-time">
                        {memory.updatedAt !== memory.createdAt
                          ? `${t('memory.edited')} ${formatRelativeTime(memory.updatedAt)}`
                          : `${t('memory.created')} ${formatRelativeTime(memory.createdAt)}`}
                      </span>
                      <button
                        className="persistent-memory-edit-btn"
                        onClick={() => {
                          setEditingId(memory.id)
                          setEditKey(memory.key)
                          setEditValue(memory.value)
                        }}
                      >
                        {t('memory.edit')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
