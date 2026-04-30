/**
 * OntologyPanel — Typed entity graph for v1.2.2.
 *
 * Manages Person, Project, Task, Event, Document entities with properties
 * and relationships. Entities are browsable/editable and can be injected as
 * a compact context block into the system prompt.
 */

import { useState } from 'react'
import type { OntologyEntity, EntityType } from '../types'
import { getEntityIcon, getEntityColor } from '../lib/storage'
import { t } from '../lib/i18n'

interface OntologyPanelProps {
  entities: OntologyEntity[]
  onAdd: (type: EntityType, name: string, properties: Record<string, string>) => void
  onEdit: (id: string, name: string, properties: Record<string, string>) => void
  onDelete: (id: string) => void
  onAddRelationship: (fromId: string, toId: string, label: string) => void
  onRemoveRelationship: (fromId: string, toId: string) => void
  onInjectAsContext: () => void
  onClose: () => void
}

const ENTITY_TYPES: EntityType[] = ['person', 'project', 'task', 'event', 'document']

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return t('ontology.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function propertyKeyValue(props: Record<string, string>): [string, string][] {
  return Object.entries(props).filter(([, v]) => v.trim())
}

export function OntologyPanel({
  entities,
  onAdd,
  onEdit,
  onDelete,
  onAddRelationship,
  onRemoveRelationship,
  onInjectAsContext,
  onClose,
}: OntologyPanelProps) {
  const [activeType, setActiveType] = useState<EntityType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editProps, setEditProps] = useState<Record<string, string>>({})
  const [addType, setAddType] = useState<EntityType>('person')
  const [addName, setAddName] = useState('')
  const [addPropKey, setAddPropKey] = useState('')
  const [addPropValue, setAddPropValue] = useState('')
  const [propsList, setPropsList] = useState<[string, string][]>([])
  const [relTargetId, setRelTargetId] = useState('')
  const [relLabel, setRelLabel] = useState('')
  const [showRelPicker, setShowRelPicker] = useState<string | null>(null)

  const filtered = entities
    .filter((e) => activeType === 'all' || e.type === activeType)
    .filter((e) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        e.name.toLowerCase().includes(q) ||
        Object.values(e.properties).some((v) => v.toLowerCase().includes(q))
      )
    })

  const handleAdd = () => {
    const props: Record<string, string> = {}
    for (const [k, v] of propsList) {
      if (k.trim() && v.trim()) props[k.trim()] = v.trim()
    }
    if (addName.trim()) {
      onAdd(addType, addName.trim(), props)
      setAddName('')
      setPropsList([])
      setShowAdd(false)
    }
  }

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      const props: Record<string, string> = {}
      for (const [k, v] of Object.entries(editProps)) {
        if (k.trim() && v.trim()) props[k.trim()] = v.trim()
      }
      onEdit(editingId, editName.trim(), props)
      setEditingId(null)
      setEditName('')
      setEditProps({})
    }
  }

  const addProp = () => {
    if (addPropKey.trim()) {
      setPropsList([...propsList, [addPropKey.trim(), addPropValue]])
      setAddPropKey('')
      setAddPropValue('')
    }
  }

  const removeProp = (idx: number) => {
    setPropsList(propsList.filter((_, i) => i !== idx))
  }

  const handleAddRel = (entityId: string) => {
    if (relTargetId && relLabel.trim()) {
      onAddRelationship(entityId, relTargetId, relLabel.trim())
      setRelTargetId('')
      setRelLabel('')
      setShowRelPicker(null)
    }
  }

  const otherEntities = entities.filter((e) => e.id !== showRelPicker)

  return (
    <div className="ontology-panel">
      {/* Header */}
      <div className="ontology-header">
        <div className="ontology-title-row">
          <h3>{t('ontology.title')}</h3>
          <button className="ontology-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="ontology-subtitle">{t('ontology.subtitle')}</p>
      </div>

      {/* Search + Inject button */}
      <div className="ontology-toolbar">
        <input
          className="ontology-search"
          type="text"
          placeholder={t('ontology.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="ontology-inject-btn" onClick={onInjectAsContext}>
          {t('ontology.injectContext')}
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="ontology-tabs">
        <button
          className={`ontology-tab ${activeType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveType('all')}
        >
          {t('ontology.all')} ({entities.length})
        </button>
        {ENTITY_TYPES.map((type) => {
          const count = entities.filter((e) => e.type === type).length
          return (
            <button
              key={type}
              className={`ontology-tab ${activeType === type ? 'active' : ''}`}
              onClick={() => setActiveType(type)}
            >
              {getEntityIcon(type)} {t(`ontology.type.${type}`)} ({count})
            </button>
          )
        })}
      </div>

      {/* Add button */}
      <button className="ontology-add-btn" onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? '✕ Cancel' : `+ ${t('ontology.addNew')}`}
      </button>

      {/* Add form */}
      {showAdd && (
        <div className="ontology-add-form">
          <div className="ontology-add-type-row">
            <select
              className="ontology-type-select"
              value={addType}
              onChange={(e) => setAddType(e.target.value as EntityType)}
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getEntityIcon(type)} {t(`ontology.type.${type}`)}
                </option>
              ))}
            </select>
            <input
              className="ontology-name-input"
              type="text"
              placeholder={t('ontology.namePlaceholder')}
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Properties */}
          <div className="ontology-props-section">
            <div className="ontology-prop-row">
              <input
                className="ontology-prop-key"
                type="text"
                placeholder={t('ontology.propKeyPlaceholder')}
                value={addPropKey}
                onChange={(e) => setAddPropKey(e.target.value)}
              />
              <input
                className="ontology-prop-value"
                type="text"
                placeholder={t('ontology.propValuePlaceholder')}
                value={addPropValue}
                onChange={(e) => setAddPropValue(e.target.value)}
              />
              <button className="ontology-prop-add-btn" onClick={addProp}>
                +
              </button>
            </div>
            {propsList.map(([k, v], idx) => (
              <div key={idx} className="ontology-prop-item">
                <span className="ontology-prop-key-label">{k}:</span>
                <span className="ontology-prop-value-label">{v || '(empty)'}</span>
                <button className="ontology-prop-remove-btn" onClick={() => removeProp(idx)}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="ontology-add-actions">
            <button className="ontology-save-btn" onClick={handleAdd}>
              {t('ontology.save')}
            </button>
            <button className="ontology-cancel-btn" onClick={() => setShowAdd(false)}>
              {t('ontology.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Entity list */}
      <div className="ontology-list">
        {filtered.length === 0 ? (
          <div className="ontology-empty">
            <span className="ontology-empty-icon">🔗</span>
            <p>{t('ontology.empty')}</p>
            <span className="ontology-empty-hint">{t('ontology.emptyHint')}</span>
          </div>
        ) : (
          filtered.map((entity) => {
            const rels = entity.relationships
              .map((rid) => entities.find((e) => e.id === rid))
              .filter(Boolean) as OntologyEntity[]
            return (
              <div key={entity.id} className="ontology-card">
                <div className="ontology-card-header">
                  <span
                    className="ontology-card-dot"
                    style={{ backgroundColor: getEntityColor(entity.type) }}
                  />
                  <span className="ontology-card-icon">{getEntityIcon(entity.type)}</span>
                  <span className="ontology-card-name">
                    {editingId === entity.id ? (
                      <input
                        className="ontology-edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      entity.name
                    )}
                  </span>
                  <span
                    className="ontology-card-type-badge"
                    style={{ borderColor: getEntityColor(entity.type) }}
                  >
                    {t(`ontology.type.${entity.type}`)}
                  </span>
                </div>

                {/* Properties */}
                {propertyKeyValue(entity.properties).length > 0 && (
                  <div className="ontology-card-props">
                    {propertyKeyValue(entity.properties).map(([k, v]) => (
                      <span key={k} className="ontology-prop-chip">
                        <span className="ontology-prop-chip-key">{k}:</span>
                        <span className="ontology-prop-chip-value">{v}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Relationships */}
                {rels.length > 0 && (
                  <div className="ontology-card-rels">
                    {rels.map((rel) => (
                      <span key={rel.id} className="ontology-rel-chip">
                        {getEntityIcon(rel.type)} {rel.name}
                        <button
                          className="ontology-rel-remove"
                          onClick={() => onRemoveRelationship(entity.id, rel.id)}
                          title={t('ontology.removeRel')}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <button
                      className="ontology-rel-add-btn"
                      onClick={() => setShowRelPicker(showRelPicker === entity.id ? null : entity.id)}
                      title={t('ontology.addRel')}
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Relationship picker */}
                {showRelPicker === entity.id && (
                  <div className="ontology-rel-picker">
                    <select
                      className="ontology-rel-select"
                      value={relTargetId}
                      onChange={(e) => setRelTargetId(e.target.value)}
                    >
                      <option value="">{t('ontology.selectEntity')}</option>
                      {otherEntities.map((e) => (
                        <option key={e.id} value={e.id}>
                          {getEntityIcon(e.type)} {e.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="ontology-rel-label-input"
                      type="text"
                      placeholder={t('ontology.relLabelPlaceholder')}
                      value={relLabel}
                      onChange={(e) => setRelLabel(e.target.value)}
                    />
                    <button className="ontology-rel-save-btn" onClick={() => handleAddRel(entity.id)}>
                      {t('ontology.addRel')}
                    </button>
                  </div>
                )}

                {/* Edit mode */}
                {editingId === entity.id ? (
                  <div className="ontology-edit-area">
                    <input
                      className="ontology-edit-prop-key"
                      type="text"
                      placeholder="Key"
                      value={Object.keys(editProps)[0] ?? ''}
                      onChange={(e) =>
                        setEditProps({ ...editProps, [e.target.value]: editProps[e.target.value] ?? '' })
                      }
                    />
                    <input
                      className="ontology-edit-prop-value"
                      type="text"
                      placeholder="Value"
                      value={Object.values(editProps)[0] ?? ''}
                      onChange={(e) => {
                        const keys = Object.keys(editProps)
                        const newProps = { ...editProps }
                        if (keys.length > 0) {
                          newProps[keys[0]] = e.target.value
                        }
                        setEditProps(newProps)
                      }}
                    />
                    <div className="ontology-edit-actions">
                      <button className="ontology-save-btn" onClick={handleSaveEdit}>
                        {t('ontology.save')}
                      </button>
                      <button className="ontology-discard-btn" onClick={() => setEditingId(null)}>
                        {t('ontology.discard')}
                      </button>
                      <button
                        className="ontology-delete-btn"
                        onClick={() => {
                          if (window.confirm(t('ontology.confirmDelete'))) onDelete(entity.id)
                        }}
                      >
                        {t('ontology.delete')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ontology-card-meta">
                    <span className="ontology-card-time">
                      {t('ontology.updated')} {formatRelativeTime(entity.updatedAt)}
                    </span>
                    <button
                      className="ontology-edit-btn"
                      onClick={() => {
                        setEditingId(entity.id)
                        setEditName(entity.name)
                        setEditProps(entity.properties)
                      }}
                    >
                      {t('ontology.edit')}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
