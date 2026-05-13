import { useState, useCallback, useEffect } from 'react'
import type { Snippet, SnippetCategory } from '../types'
import { loadSnippets, saveSnippet, deleteSnippet } from '../lib/storage'
import { t } from '../lib/i18n'
import { QUICK_CONTEXT_TEMPLATES, templateToSnippet } from '../data/quickContexts'

const CATEGORIES: SnippetCategory[] = ['code', 'text', 'template', 'reference', 'custom']
const CATEGORY_ICONS: Record<SnippetCategory, string> = {
  code: '⟨/⟩',
  text: '¶',
  template: '☰',
  reference: '※',
  custom: '✎',
}
const CATEGORY_COLORS: Record<SnippetCategory, string> = {
  code: '#61dafb',
  text: '#a78bfa',
  template: '#f59e0b',
  reference: '#10b981',
  custom: '#f472b6',
}

interface Props {
  onInsert: (content: string) => void
}

export function SnippetLibrary({ onInsert }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [filter, setFilter] = useState<SnippetCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [editing, setEditing] = useState<Snippet | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<SnippetCategory>('code')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSnippets().then((s) => {
      setSnippets(s)
      setLoading(false)
    })
  }, [])

  const handleSave = useCallback(() => {
    if (!title.trim()) return
    if (editing) {
      saveSnippet({ ...editing, title: title.trim(), content, category })
      setSnippets((prev) =>
        prev.map((s) => (s.id === editing.id ? { ...editing, title: title.trim(), content, category, updatedAt: Date.now() } : s)),
      )
    } else {
      const newSnippet: Snippet = {
        id: `snip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: title.trim(),
        content,
        category,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      saveSnippet(newSnippet)
      setSnippets((prev) => [newSnippet, ...prev])
    }
    setEditing(null)
    setTitle('')
    setContent('')
    setCategory('code')
  }, [title, content, category, editing])

  const handleDelete = useCallback(
    (id: string) => {
      deleteSnippet(id)
      setSnippets((prev) => prev.filter((s) => s.id !== id))
      if (editing?.id === id) setEditing(null)
    },
    [editing],
  )

  const handleEdit = useCallback((s: Snippet) => {
    setEditing(s)
    setTitle(s.title)
    setContent(s.content)
    setCategory(s.category)
  }, [])

  const handleCancel = useCallback(() => {
    setEditing(null)
    setTitle('')
    setContent('')
    setCategory('code')
  }, [])

  const handleInsert = useCallback(
    (s: Snippet) => {
      navigator.clipboard.writeText(s.content).then(() => {
        alert(t('contextLibrary.inserted'))
      }).catch(() => {
        // Fallback: just show alert
        alert(t('contextLibrary.inserted'))
      })
    },
    [],
  )

  const handleLoadTemplate = useCallback((template: typeof QUICK_CONTEXT_TEMPLATES[number]) => {
    const snippet = templateToSnippet(template)
    saveSnippet(snippet)
    setSnippets((prev) => [snippet, ...prev])
    alert(t('contextLibrary.templateLoaded'))
  }, [])

  const filtered = snippets.filter((s) => {
    if (filter !== 'all' && s.category !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="snippet-library">
      {/* Header */}
      <div className="snippet-library-header">
        <h2 className="snippet-library-title">{t('contextLibrary.title')}</h2>
        <p className="snippet-library-subtitle">{t('contextLibrary.subtitle')}</p>
      </div>

      {/* Category filter */}
      <div className="snippet-library-filters">
        <button
          className={`snippet-filter-btn ${filter === 'all' ? 'snippet-filter-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('contextLibrary.all')}
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`snippet-filter-btn ${filter === cat ? 'snippet-filter-active' : ''}`}
            onClick={() => setFilter(cat)}
            style={filter === cat ? { borderColor: CATEGORY_COLORS[cat] } : {}}
          >
            <span className="snippet-filter-icon" style={{ color: CATEGORY_COLORS[cat] }}>
              {CATEGORY_ICONS[cat]}
            </span>
            {t(`contextLibrary.cat_${cat}`)}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        className="snippet-library-search"
        type="text"
        placeholder={t('contextLibrary.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Quick Contexts toggle */}
      <button
        className="quick-contexts-toggle"
        onClick={() => setShowTemplates(!showTemplates)}
      >
        <span className="quick-contexts-icon">⚡</span>
        <span>{t('contextLibrary.quickContexts')}</span>
        <span className="quick-contexts-chevron">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showTemplates ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Quick Contexts templates */}
      {showTemplates && (
        <div className="quick-contexts-section">
          <div className="quick-contexts-title">{t('contextLibrary.quickContextsTitle')}</div>
          <div className="quick-contexts-grid">
            {QUICK_CONTEXT_TEMPLATES.map((tmpl) => (
              <div key={tmpl.id} className="quick-context-card">
                <div className="quick-context-card-header">
                  <span className="quick-context-card-icon">{tmpl.icon}</span>
                  <span className="quick-context-card-title">{tmpl.title}</span>
                </div>
                <div className="quick-context-card-desc">{tmpl.description}</div>
                <div className="quick-context-card-actions">
                  <button
                    className="quick-context-btn-load"
                    onClick={() => handleLoadTemplate(tmpl)}
                  >
                    {t('contextLibrary.loadTemplate')}
                  </button>
                  <button
                    className="quick-context-btn-preview"
                    onClick={() => {
                      navigator.clipboard.writeText(tmpl.content)
                      alert(t('contextLibrary.inserted'))
                    }}
                  >
                    📋 {t('contextLibrary.copy')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="snippet-edit-form">
          <input
            className="snippet-edit-title"
            type="text"
            placeholder={t('contextLibrary.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="snippet-edit-content"
            placeholder={t('contextLibrary.contentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          <div className="snippet-edit-meta">
            <select
              className="snippet-edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as SnippetCategory)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`contextLibrary.cat_${cat}`)}
                </option>
              ))}
            </select>
            <div className="snippet-edit-actions">
              <button className="snippet-btn-cancel" onClick={handleCancel}>
                {t('contextLibrary.cancel')}
              </button>
              <button className="snippet-btn-save" onClick={handleSave}>
                {t('contextLibrary.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snippet cards */}
      {loading ? (
        <div className="snippet-empty">{t('contextLibrary.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="snippet-empty">
          {search || filter !== 'all'
            ? t('contextLibrary.noResults')
            : t('contextLibrary.emptyHint')}
        </div>
      ) : (
        <div className="snippet-grid">
          {filtered.map((s) => (
            <div key={s.id} className="snippet-card">
              <div className="snippet-card-header">
                <span
                  className="snippet-card-icon"
                  style={{ color: CATEGORY_COLORS[s.category] }}
                >
                  {CATEGORY_ICONS[s.category]}
                </span>
                <span className="snippet-card-title">{s.title}</span>
                <span
                  className="snippet-card-cat"
                  style={{ color: CATEGORY_COLORS[s.category] }}
                >
                  {t(`contextLibrary.cat_${s.category}`)}
                </span>
              </div>
              <div className="snippet-card-preview">
                {s.content.length > 120
                  ? s.content.slice(0, 120) + '…'
                  : s.content}
              </div>
              <div className="snippet-card-actions">
                <button className="snippet-btn-insert" onClick={() => handleInsert(s)}>
                  {t('contextLibrary.insert')}
                </button>
                <button className="snippet-btn-edit" onClick={() => handleEdit(s)}>
                  {t('contextLibrary.edit')}
                </button>
                <button className="snippet-btn-delete" onClick={() => handleDelete(s.id)}>
                  {t('contextLibrary.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New snippet button */}
      {!editing && (
        <button className="snippet-add-btn" onClick={() => setEditing({} as Snippet)}>
          + {t('contextLibrary.add')}
        </button>
      )}
    </div>
  )
}
