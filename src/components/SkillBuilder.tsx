/**
 * Skill Builder — In-app skill editor.
 *
 * Allows users to create, edit, and export skills as
 * `.monday-skill` JSON files. Features:
 * - Name, description, tag picker, markdown instructions
 * - Live token-count estimate
 * - Required-plugin URL picker
 * - Export / Import `.monday-skill` JSON
 * - Save to / delete from IndexedDB
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { saveSkills, loadSkills, deleteSkill } from '../lib/storage'
import { t } from '../lib/i18n'
import type { Skill } from '../types'

const ALL_TAGS = [
  'coding', 'writing', 'research', 'data', 'language', 'creative',
  'debugging', 'typescript', 'react', 'api-design', 'sql', 'git',
  'docker', 'devops', 'documentation', 'email', 'blog', 'seo',
  'education', 'code-review', 'papers', 'analysis', 'synthesis',
  'hypothesis', 'scientific-method', 'statistics', 'visualization',
  'd3js', 'etl', 'pipeline', 'translation', 'multilingual',
  'grammar', 'japanese', 'ux-writing', 'microcopy', 'games',
  'design', 'fiction', 'storytelling', 'branding', 'copywriting',
] as const

export interface SkillBuilderProps {
  onBack: () => void
  /** If provided, edit this existing skill; otherwise create new */
  initialSkill?: Skill | null
  /** Callback when the skill is saved (reloads the list) */
  onSave?: () => void
}

/** Rough token estimate: words / 1.3 + newline bonus */
function estimateTokens(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const newlines = (text.match(/\n/g) || []).length
  return Math.floor(words / 1.3) + newlines
}

export function SkillBuilder({ onBack, initialSkill, onSave }: SkillBuilderProps) {
  const isEditing = !!initialSkill

  const [name, setName] = useState(initialSkill?.name ?? '')
  const [description, setDescription] = useState(initialSkill?.description ?? '')
  const [instructions, setInstructions] = useState(initialSkill?.instructions ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSkill?.tags ?? [])
  const [pluginUrls, setPluginUrls] = useState<string[]>(initialSkill?.requiredPlugins ?? [])
  const [newPluginUrl, setNewPluginUrl] = useState('')
  const [icon, setIcon] = useState(initialSkill?.icon ?? '📄')
  const [version, setVersion] = useState(initialSkill?.version ?? '1.0.0')
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [searchTag, setSearchTag] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load installed skills to check for duplicates
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    loadSkills().then((skills) => setInstalledIds(new Set(skills.map((s) => s.id))))
  }, [])

  const tokenCount = estimateTokens(instructions)

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setSaveStatus('error')
      return
    }
    setSaveStatus('saving')
    try {
      const skills = await loadSkills()
      const skill: Skill = {
        id: initialSkill?.id ?? crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        requiredPlugins: pluginUrls.filter((u) => u.trim()),
        version,
        tags: selectedTags,
        icon: icon || '📄',
        createdAt: initialSkill?.createdAt ?? Date.now(),
        lastUsedAt: null,
      }
      // Remove existing with same id (editing) or check for name conflict (new)
      const filtered = skills.filter((s) => s.id !== skill.id)
      if (!initialSkill && filtered.find((s) => s.name.toLowerCase() === skill.name.toLowerCase())) {
        setSaveStatus('error')
        return
      }
      await saveSkills([...filtered, skill])
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      onSave?.()
    } catch {
      setSaveStatus('error')
    }
  }, [name, description, instructions, selectedTags, pluginUrls, icon, version, initialSkill, onSave])

  const handleDelete = useCallback(async () => {
    if (!initialSkill || !confirm(t('skillBuilder.confirmDelete'))) return
    await deleteSkill(initialSkill.id)
    onBack()
  }, [initialSkill, onBack])

  const handleExport = useCallback(() => {
    const skill: Skill = {
      id: initialSkill?.id ?? crypto.randomUUID(),
      name: name.trim() || 'Untitled Skill',
      description: description.trim(),
      instructions: instructions.trim(),
      requiredPlugins: pluginUrls.filter((u) => u.trim()),
      version,
      tags: selectedTags,
      icon: icon || '📄',
      createdAt: initialSkill?.createdAt ?? Date.now(),
      lastUsedAt: null,
    }
    const json = JSON.stringify(skill, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(name.trim() || 'skill').toLowerCase().replace(/\s+/g, '-')}.monday-skill.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [name, description, instructions, selectedTags, pluginUrls, icon, version, initialSkill])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const skill: Skill = JSON.parse(text)
      if (!skill.name || !skill.instructions) {
        setSaveStatus('error')
        return
      }
      setName(skill.name)
      setDescription(skill.description ?? '')
      setInstructions(skill.instructions)
      setSelectedTags(skill.tags ?? [])
      setPluginUrls(skill.requiredPlugins ?? [])
      setIcon(skill.icon ?? '📄')
      setVersion(skill.version ?? '1.0.0')
      setActiveTab('edit')
      setSaveStatus('idle')
    } catch {
      setSaveStatus('error')
    } finally {
      e.target.value = ''
    }
  }, [])

  const addTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) setSelectedTags((prev) => [...prev, tag])
  }, [])

  const removeTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const addPluginUrl = useCallback(() => {
    const url = newPluginUrl.trim()
    if (url && !pluginUrls.includes(url)) {
      setPluginUrls((prev) => [...prev, url])
      setNewPluginUrl('')
    }
  }, [newPluginUrl, pluginUrls])

  const removePluginUrl = useCallback((url: string) => {
    setPluginUrls((prev) => prev.filter((u) => u !== url))
  }, [])

  const filteredTags = ALL_TAGS.filter(
    (tag) =>
      !selectedTags.includes(tag) &&
      (searchTag === '' || tag.includes(searchTag.toLowerCase())),
  )

  return (
    <div className="skill-builder">
      {/* Header */}
      <div className="skill-builder-header">
        <button className="skill-builder-back-btn" onClick={onBack} title={t('skillBuilder.back')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          {t('skillBuilder.back')}
        </button>
        <h2 className="skill-builder-title">
          {isEditing ? t('skillBuilder.editTitle') : t('skillBuilder.newTitle')}
        </h2>
        <div className="skill-builder-actions">
          <button className="skill-builder-export-btn" onClick={handleExport} title={t('skillBuilder.export')}>
            📥 {t('skillBuilder.export')}
          </button>
          <button className="skill-builder-import-btn" onClick={handleImport} title={t('skillBuilder.import')}>
            📤 {t('skillBuilder.import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.monday-skill"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="skill-builder-tabs">
        <button
          className={`skill-builder-tab ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          {t('skillBuilder.tabEdit')}
        </button>
        <button
          className={`skill-builder-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          {t('skillBuilder.tabPreview')}
        </button>
      </div>

      {activeTab === 'edit' ? (
        <div className="skill-builder-body">
          {/* Icon */}
          <div className="skill-builder-field">
            <label className="skill-builder-label">{t('skillBuilder.icon')}</label>
            <input
              className="skill-builder-icon-input"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 2))}
              placeholder="📄"
              maxLength={2}
            />
            <span className="skill-builder-hint">{t('skillBuilder.iconHint')}</span>
          </div>

          {/* Name */}
          <div className="skill-builder-field">
            <label className="skill-builder-label">{t('skillBuilder.name')}</label>
            <input
              className="skill-builder-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('skillBuilder.namePlaceholder')}
              maxLength={64}
            />
          </div>

          {/* Description */}
          <div className="skill-builder-field">
            <label className="skill-builder-label">{t('skillBuilder.description')}</label>
            <input
              className="skill-builder-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('skillBuilder.descriptionPlaceholder')}
              maxLength={200}
            />
            <span className="skill-builder-hint">{description.length}/200</span>
          </div>

          {/* Tags */}
          <div className="skill-builder-field">
            <label className="skill-builder-label">{t('skillBuilder.tags')}</label>
            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="skill-builder-tags-selected">
                {selectedTags.map((tag) => (
                  <span key={tag} className="skill-builder-tag-chip">
                    {tag}
                    <button
                      className="skill-builder-tag-remove"
                      onClick={() => removeTag(tag)}
                      title={t('skillBuilder.removeTag')}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Tag search */}
            <div className="skill-builder-tag-search">
              <input
                className="skill-builder-input skill-builder-tag-input"
                type="text"
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                placeholder={t('skillBuilder.searchTags')}
              />
            </div>
            {/* Tag suggestions */}
            {filteredTags.length > 0 && (
              <div className="skill-builder-tag-suggestions">
                {filteredTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    className="skill-builder-tag-suggestion"
                    onClick={() => addTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="skill-builder-field skill-builder-field-instructions">
            <div className="skill-builder-label-row">
              <label className="skill-builder-label">{t('skillBuilder.instructions')}</label>
              <span className="skill-builder-token-count">
                ⚡ {tokenCount} {t('skillBuilder.tokens')}
              </span>
            </div>
            <textarea
              className="skill-builder-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t('skillBuilder.instructionsPlaceholder')}
              rows={12}
            />
            <span className="skill-builder-hint">
              Markdown supported · {instructions.length} chars · ~{tokenCount} tokens
            </span>
          </div>

          {/* Required Plugins */}
          <div className="skill-builder-field">
            <label className="skill-builder-label">{t('skillBuilder.requiredPlugins')}</label>
            {pluginUrls.length > 0 && (
              <div className="skill-builder-plugins-list">
                {pluginUrls.map((url) => (
                  <div key={url} className="skill-builder-plugin-chip">
                    <span className="skill-builder-plugin-url">{url}</span>
                    <button
                      className="skill-builder-plugin-remove"
                      onClick={() => removePluginUrl(url)}
                      title={t('skillBuilder.removePlugin')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="skill-builder-plugin-input-row">
              <input
                className="skill-builder-input skill-builder-plugin-input"
                type="url"
                value={newPluginUrl}
                onChange={(e) => setNewPluginUrl(e.target.value)}
                placeholder={t('skillBuilder.pluginUrlPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && addPluginUrl()}
              />
              <button className="skill-builder-add-btn" onClick={addPluginUrl}>
                + {t('skillBuilder.add')}
              </button>
            </div>
            <span className="skill-builder-hint">{t('skillBuilder.pluginHint')}</span>
          </div>

          {/* Version */}
          <div className="skill-builder-field">
            <label className="skill-builder-label">{t('skillBuilder.version')}</label>
            <input
              className="skill-builder-input skill-builder-version-input"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              maxLength={16}
            />
          </div>

          {/* Save / Delete */}
          <div className="skill-builder-footer">
            <button
              className={`skill-builder-save-btn ${saveStatus}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? '…' : saveStatus === 'saved' ? '✓' : '💾'}{' '}
              {t('skillBuilder.save')}
            </button>
            {isEditing && (
              <button
                className="skill-builder-delete-btn"
                onClick={handleDelete}
              >
                🗑 {t('skillBuilder.delete')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="skill-builder-preview">
          <div className="skill-builder-preview-card">
            <div className="skill-builder-preview-header">
              <span className="skill-builder-preview-icon">{icon || '📄'}</span>
              <span className="skill-builder-preview-name">{name || t('skillBuilder.untitled')}</span>
              <span className="skill-builder-preview-version">v{version}</span>
            </div>
            {description && <p className="skill-builder-preview-desc">{description}</p>}
            {selectedTags.length > 0 && (
              <div className="skill-builder-preview-tags">
                {selectedTags.map((tag) => (
                  <span key={tag} className="skill-builder-preview-tag">{tag}</span>
                ))}
              </div>
            )}
            {instructions && (
              <div className="skill-builder-preview-instructions">
                <h4 className="skill-builder-preview-section-title">{t('skillBuilder.instructions')}</h4>
                <pre className="skill-builder-preview-content">{instructions}</pre>
              </div>
            )}
            {pluginUrls.length > 0 && (
              <div className="skill-builder-preview-plugins">
                <h4 className="skill-builder-preview-section-title">{t('skillBuilder.requiredPlugins')}</h4>
                {pluginUrls.map((url) => (
                  <code key={url} className="skill-builder-preview-plugin-code">{url}</code>
                ))}
              </div>
            )}
            <div className="skill-builder-preview-meta">
              <span>⚡ ~{tokenCount} tokens</span>
              <span>📝 {instructions.length} chars</span>
              <span>🏷 {selectedTags.length} tags</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
