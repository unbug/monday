/**
 * Publish a persona to the community registry.
 * Generates a JSON snippet users can copy and submit as a PR.
 */

import { useState, useCallback } from 'react'
import { MARKETPLACE_CATEGORIES, MARKETPLACE_CATEGORY_LABELS } from '../data/personaRegistry'
import type { MarketplacePersona } from '../data/personaRegistry'

interface PublishPersonaForm {
  name: string
  icon: string
  description: string
  systemPrompt: string
  category: MarketplacePersona['category']
  tags: string
}

const DEFAULT_FORM: PublishPersonaForm = {
  name: '',
  icon: '✨',
  description: '',
  systemPrompt: '',
  category: 'coding',
  tags: '',
}

export function PersonaPublish() {
  const [form, setForm] = useState<PublishPersonaForm>(DEFAULT_FORM)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'form' | 'preview' | 'json'>('form')

  const updateField = useCallback(
    (field: keyof PublishPersonaForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const handleGenerate = useCallback(() => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return
    setStep('preview')
  }, [form.name, form.systemPrompt])

  const handleCopy = useCallback(() => {
    const entry: MarketplacePersona = {
      id: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: form.name.trim(),
      icon: form.icon.trim() || '✨',
      category: form.category,
      description: form.description.trim(),
      systemPrompt: form.systemPrompt.trim(),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    const json = JSON.stringify(entry, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [form])

  const handleReset = useCallback(() => {
    setForm(DEFAULT_FORM)
    setStep('form')
  }, [])

  const preview = {
    id: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    name: form.name.trim() || 'Persona Name',
    icon: form.icon.trim() || '✨',
    category: form.category,
    description: form.description.trim() || 'Description',
    systemPrompt: form.systemPrompt.trim() || 'System prompt',
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  }

  return (
    <div className="persona-publish">
      <div className="persona-publish-header">
        <h2 className="persona-publish-title">Publish Persona</h2>
        <p className="persona-publish-subtitle">
          Create a persona to share with the community. Fill in the details, preview, then copy the JSON to submit as a PR.
        </p>
      </div>

      {/* Steps */}
      <div className="persona-publish-steps">
        {(['form', 'preview', 'json'] as const).map((s, i) => (
          <button
            key={s}
            className={`persona-publish-step-btn ${step === s ? 'active' : ''} ${i <= ['form', 'preview', 'json'].indexOf(step) ? 'done' : ''}`}
            onClick={() => setStep(s)}
          >
            <span className="persona-publish-step-num">{i + 1}</span>
            <span className="persona-publish-step-label">
              {s === 'form' ? 'Details' : s === 'preview' ? 'Preview' : 'JSON'}
            </span>
          </button>
        ))}
      </div>

      {/* Step 1: Form */}
      {step === 'form' && (
        <div className="persona-publish-form">
          <div className="persona-publish-field">
            <label className="persona-publish-label">Name *</label>
            <input
              className="persona-publish-input"
              type="text"
              placeholder="e.g. Code Reviewer"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div className="persona-publish-row">
            <div className="persona-publish-field">
              <label className="persona-publish-label">Icon</label>
              <input
                className="persona-publish-input persona-publish-input--icon"
                type="text"
                placeholder="✨"
                value={form.icon}
                onChange={(e) => updateField('icon', e.target.value)}
              />
            </div>
            <div className="persona-publish-field">
              <label className="persona-publish-label">Category</label>
              <select
                className="persona-publish-input persona-publish-input--select"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                {MARKETPLACE_CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                  <option key={cat} value={cat}>
                    {MARKETPLACE_CATEGORY_LABELS[cat]?.replace(/^.\s*/, '') || cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="persona-publish-field">
            <label className="persona-publish-label">Description</label>
            <input
              className="persona-publish-input"
              type="text"
              placeholder="Brief description of what this persona does"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          <div className="persona-publish-field">
            <label className="persona-publish-label">System Prompt *</label>
            <textarea
              className="persona-publish-textarea"
              placeholder="Describe the persona's behavior, tone, and expertise..."
              rows={8}
              value={form.systemPrompt}
              onChange={(e) => updateField('systemPrompt', e.target.value)}
            />
          </div>

          <div className="persona-publish-field">
            <label className="persona-publish-label">Tags</label>
            <input
              className="persona-publish-input"
              type="text"
              placeholder="comma-separated, e.g. review, quality, best-practices"
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
            />
          </div>

          <div className="persona-publish-actions">
            <button className="persona-publish-btn persona-publish-btn--primary" onClick={handleGenerate}>
              Preview →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="persona-publish-preview">
          <div className="persona-publish-preview-card">
            <div className="persona-publish-preview-header">
              <span className="persona-publish-preview-icon">{preview.icon}</span>
              <div>
                <h3 className="persona-publish-preview-name">{preview.name}</h3>
                <span className="persona-publish-preview-category">
                  {MARKETPLACE_CATEGORY_LABELS[preview.category]?.replace(/^.\s*/, '') || preview.category}
                </span>
              </div>
            </div>
            <p className="persona-publish-preview-desc">{preview.description}</p>
            <div className="persona-publish-preview-tags">
              {preview.tags.map((tag) => (
                <span key={tag} className="persona-publish-tag">
                  {tag}
                </span>
              ))}
            </div>
            <details className="persona-publish-preview-prompt">
              <summary className="persona-publish-preview-prompt-summary">System Prompt</summary>
              <pre className="persona-publish-preview-prompt-text">{preview.systemPrompt}</pre>
            </details>
          </div>

          <div className="persona-publish-actions">
            <button className="persona-publish-btn" onClick={() => setStep('form')}>
              ← Back
            </button>
            <button className="persona-publish-btn persona-publish-btn--primary" onClick={() => setStep('json')}>
              Generate JSON →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: JSON */}
      {step === 'json' && (
        <div className="persona-publish-json">
          <div className="persona-publish-json-info">
            <p>
              Copy this JSON and submit it as a PR to the{' '}
              <a
                href="https://github.com/unbug/monday/blob/main/src/data/personaRegistry.ts"
                target="_blank"
                rel="noopener noreferrer"
              >
                personaRegistry.ts
              </a>{' '}
              file. Add your entry to the <code>PERSONA_REGISTRY</code> array.
            </p>
          </div>
          <pre className="persona-publish-json-code">
            <code>{JSON.stringify(preview, null, 2)}</code>
          </pre>
          <div className="persona-publish-actions">
            <button className="persona-publish-btn" onClick={() => setStep('preview')}>
              ← Back
            </button>
            <button
              className={`persona-publish-btn persona-publish-btn--primary ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy JSON'}
            </button>
            <button className="persona-publish-btn persona-publish-btn--danger" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
