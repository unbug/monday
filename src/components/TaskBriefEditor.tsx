/**
 * TaskBriefEditor — per-task markdown config for the agent loop.
 *
 * AGENTS.md / CLAUDE.md equivalent: declares goal, allowed domains,
 * step budget, and stop criteria. Stored in IndexedDB.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  loadAllTaskBriefs,
  loadTaskBrief,
  saveTaskBrief,
  deleteTaskBrief,
} from '../lib/storage'
import type { TaskBrief } from '../types'
import { t } from '../lib/i18n'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  /** Currently active task brief ID (null = none) */
  activeBriefId: string | null
  /** Called when the user selects a different brief */
  onBriefChange: (id: string | null) => void
  /** Called when the user creates a new brief */
  onBriefCreated?: (id: string) => void
  /** When true, show the editor inline (not collapsed) */
  expanded?: boolean
}

const DEFAULT_BRIEF_ID = 'default'

const DEFAULT_CONTENT = `# Task Brief

## Goal
Describe what the agent should accomplish.

## Allowed Domains
- list of allowed domains (one per line)

## Step Budget
Maximum number of steps: 20

## Stop Criteria
- [ ] Condition 1
- [ ] Condition 2
`

export function TaskBriefEditor({
  activeBriefId,
  onBriefChange,
  onBriefCreated,
  expanded: expandedProp,
}: Props) {
  const [briefs, setBriefs] = useState<TaskBrief[]>([])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [expanded, setExpanded] = useState(!!expandedProp)

  // Load briefs on mount
  useEffect(() => {
    loadAllTaskBriefs().then(setBriefs)
  }, [])

  // Load active brief into editor
  useEffect(() => {
    if (activeBriefId) {
      loadTaskBriefContent(activeBriefId).then(({ n, c }) => {
        setName(n)
        setContent(c)
      })
    }
  }, [activeBriefId])

  async function loadTaskBriefContent(id: string): Promise<{ n: string; c: string }> {
    const brief = await loadTaskBrief(id)
    if (brief) {
      return { n: brief.name, c: brief.content }
    }
    return { n: id === DEFAULT_BRIEF_ID ? t('taskBrief.defaultBrief') || 'Default Brief' : id, c: DEFAULT_CONTENT }
  }

  const handleCreate = useCallback(async () => {
    if (!onBriefChange) return
    const id = `brief-${Date.now()}`
    const brief: TaskBrief = {
      id,
      name: t('taskBrief.newBrief') || 'New Brief',
      content: DEFAULT_CONTENT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveTaskBrief(brief)
    setBriefs((prev) => [...prev, brief])
    onBriefChange(id)
    onBriefCreated?.(id)
    setEditing(true)
  }, [onBriefChange, onBriefCreated])

  const handleSave = useCallback(async () => {
    if (!activeBriefId) return
    const brief = await loadTaskBrief(activeBriefId)
    if (!brief) return
    brief.name = name || t('taskBrief.untitled') || 'Untitled'
    brief.content = content
    brief.updatedAt = Date.now()
    await saveTaskBrief(brief)
    setBriefs((prev) => prev.map((b) => (b.id === brief.id ? brief : b)))
    setEditing(false)
  }, [activeBriefId, name, content])

  const handleDelete = useCallback(async () => {
    if (!activeBriefId) return
    await deleteTaskBrief(activeBriefId)
    setBriefs((prev) => prev.filter((b) => b.id !== activeBriefId))
    onBriefChange(null)
    setEditing(false)
  }, [activeBriefId, onBriefChange])

  const handleSelect = useCallback(async (id: string) => {
    onBriefChange(id)
    setExpanded(true)
    const { n, c } = await loadTaskBriefContent(id)
    setName(n)
    setContent(c)
  }, [onBriefChange])

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div className="task-brief-editor">
      {/* Brief selector */}
      <div className="task-brief-selector">
        <span className="task-brief-selector-label">
          {t('taskBrief.selectorLabel') || 'Task Brief:'}
        </span>
        <select
          className="task-brief-selector-select"
          value={activeBriefId || ''}
          onChange={(e) => {
            const id = e.target.value || null
            onBriefChange(id)
            if (id) {
              loadTaskBriefContent(id).then(({ n, c }) => {
                setName(n)
                setContent(c)
              })
            }
          }}
        >
          <option value="">{t('taskBrief.none') || 'None'}</option>
          {briefs.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button className="task-brief-create-btn" onClick={handleCreate}>
          + {t('taskBrief.create') || 'Create'}
        </button>
      </div>

      {/* Collapsible editor */}
      <div className={`task-brief-panel ${expanded ? 'expanded' : ''}`}>
        <button className="task-brief-collapse-btn" onClick={toggleExpand}>
          {expanded ? '▼' : '▶'} {t('taskBrief.title') || 'Task Brief'}
        </button>

        {expanded && (
          <div className="task-brief-content">
            {!editing ? (
              /* Preview mode */
              <div className="task-brief-preview">
                <div className="task-brief-preview-header">
                  <h4 className="task-brief-preview-name">{name}</h4>
                  <div className="task-brief-preview-actions">
                    <button
                      className="task-brief-edit-btn"
                      onClick={() => setEditing(true)}
                    >
                      ✏️ {t('taskBrief.edit') || 'Edit'}
                    </button>
                    {activeBriefId && (
                      <button
                        className="task-brief-delete-btn"
                        onClick={handleDelete}
                      >
                        🗑 {t('taskBrief.delete') || 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="task-brief-preview-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Edit mode */
              <div className="task-brief-edit">
                <input
                  className="task-brief-name-input"
                  type="text"
                  placeholder={t('taskBrief.namePlaceholder') || 'Brief name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <textarea
                  className="task-brief-content-input"
                  placeholder={t('taskBrief.contentPlaceholder') || 'Write your task brief here...'}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                />
                <div className="task-brief-edit-actions">
                  <button className="task-brief-save-btn" onClick={handleSave}>
                    ✓ {t('taskBrief.save') || 'Save'}
                  </button>
                  <button
                    className="task-brief-cancel-btn"
                    onClick={() => setEditing(false)}
                  >
                    {t('taskBrief.cancel') || 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
