/**
 * SkillWorkshop — review and approve skill refinement proposals.
 * v1.2.4: After sessions end, the model proposes skill improvements
 * based on corrections and memories. User reviews in a diff view
 * and approves → changes saved to the skill in IndexedDB.
 */

import { useState, useEffect, useCallback } from 'react'
import type { WorkshopProposal, Skill } from '../types'
import { loadWorkshopProposals, updateWorkshopProposal, saveWorkshopProposals, loadSkills } from '../lib/storage'
import { generateWorkshopProposals, applyProposalsToSkill } from '../lib/workshop'
import { useI18n } from '../lib/i18n'

interface SkillWorkshopProps {
  /** Corrections from the current/recent session */
  corrections: Array<{ message: string; timestamp: number }>
  /** Memories from the current/recent session */
  memories: Array<{ key: string; value: string; namespace: string }>
  /** Session IDs that contributed */
  sessionIds: string[]
  /** Callback when proposals are generated */
  onProposalsGenerated?: (count: number) => void
}

type Tab = 'pending' | 'history'

function formatDiff(hunk: WorkshopProposal['hunks'][0]): string {
  const lines: string[] = []
  if (hunk.oldContent) {
    lines.push(hunk.oldContent.split('\n').map((l) => `- ${l}`).join('\n'))
  }
  if (hunk.newContent) {
    lines.push(hunk.newContent.split('\n').map((l) => `+ ${l}`).join('\n'))
  }
  return lines.join('\n') || '(empty)'
}

export function SkillWorkshop({ corrections, memories, sessionIds, onProposalsGenerated }: SkillWorkshopProps) {
  const t = useI18n()
  const [proposals, setProposals] = useState<WorkshopProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [skills, setSkills] = useState<Map<string, Skill>>(new Map())

  // Load proposals and skills
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [proposalsData, skillsData] = await Promise.all([
        loadWorkshopProposals(),
        loadSkills(),
      ])
      if (!cancelled) {
        setProposals(proposalsData)
        setSkills(new Map(skillsData.map((s) => [s.id, s])))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Generate proposals from corrections + memories
  const handleGenerate = useCallback(async () => {
    if (generating) return
    setGenerating(true)

    const newProposals = await generateWorkshopProposals({
      corrections,
      memories,
      skills: Array.from(skills.values()),
      sessionIds,
    })

    if (newProposals.length > 0) {
      const updated = [...proposals, ...newProposals]
      await saveWorkshopProposals(updated)
      setProposals(updated)
      onProposalsGenerated?.(newProposals.length)
    }
    setGenerating(false)
  }, [generating, corrections, memories, skills, sessionIds, proposals, onProposalsGenerated])

  const handleApprove = useCallback(async (id: string) => {
    await updateWorkshopProposal(id, { status: 'approved', resolvedAt: Date.now() })
    setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status: 'approved', resolvedAt: Date.now() } : p))
  }, [])

  const handleReject = useCallback(async (id: string) => {
    await updateWorkshopProposal(id, { status: 'rejected', resolvedAt: Date.now() })
    setProposals((prev) => prev.map((p) => p.id === id ? { ...p, status: 'rejected', resolvedAt: Date.now() } : p))
  }, [])

  const handleApproveAll = useCallback(async () => {
    const pendingIds = proposals.filter((p) => p.status === 'pending').map((p) => p.id)
    for (const id of pendingIds) {
      await updateWorkshopProposal(id, { status: 'approved', resolvedAt: Date.now() })
    }
    setProposals((prev) => prev.map((p) => p.status === 'pending' ? { ...p, status: 'approved', resolvedAt: Date.now() } : p))
  }, [proposals])

  const handleDismiss = useCallback(async (id: string) => {
    await updateWorkshopProposal(id, { status: 'rejected', resolvedAt: Date.now() })
    setProposals((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const handleApplyApproved = useCallback(async () => {
    const approved = proposals.filter((p) => p.status === 'approved')
    if (approved.length === 0) return

    const skillsData = await loadSkills()
    let changed = false

    for (const proposal of approved) {
      const skillIdx = skillsData.findIndex((s) => s.id === proposal.skillId)
      if (skillIdx === -1) continue

      const updated = applyProposalsToSkill(skillsData[skillIdx], [proposal])
      if (updated) {
        skillsData[skillIdx] = updated
        changed = true
      }
    }

    if (changed) {
      await saveWorkshopProposals(proposals.map((p) => ({ ...p, status: 'resolved' as WorkshopProposal['status'] })))
      setProposals((prev) => prev.map((p) => ({ ...p, status: 'resolved' as WorkshopProposal['status'], resolvedAt: Date.now() })))
      setSkills(new Map(skillsData.map((s) => [s.id, s])))
    }
  }, [proposals])

  const pending = proposals.filter((p) => p.status === 'pending')
  const history = proposals.filter((p) => p.status !== 'pending')

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return '#10b981'
    if (c >= 0.6) return '#f59e0b'
    return '#ef4444'
  }

  const hunkTypeLabel = (type: string) => {
    switch (type) {
      case 'instructions': return 'Instructions'
      case 'description': return 'Description'
      case 'tags': return 'Tags'
      case 'systemPrompt': return 'System Prompt'
      case 'custom': return 'Custom'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="skill-workshop">
        <div className="skill-workshop-loading">{t('workshop.loading')}</div>
      </div>
    )
  }

  return (
    <div className="skill-workshop">
      {/* Header */}
      <div className="skill-workshop-header">
        <div className="skill-workshop-title-bar">
          <span className="skill-workshop-icon">🔧</span>
          <span className="skill-workshop-title">{t('workshop.title')}</span>
          <span className="skill-workshop-subtitle">{t('workshop.subtitle')}</span>
        </div>
        <button
          className="skill-workshop-generate-btn"
          onClick={handleGenerate}
          disabled={generating || corrections.length === 0 && memories.length === 0}
          title={t('workshop.generateTooltip')}
        >
          {generating ? '⏳' : '💡'} {t('workshop.generate')}
        </button>
      </div>

      {/* Tabs */}
      <div className="skill-workshop-tabs">
        <button
          className={`skill-workshop-tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          {t('workshop.pending')}
          {pending.length > 0 && <span className="skill-workshop-badge">{pending.length}</span>}
        </button>
        <button
          className={`skill-workshop-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          {t('workshop.history')}
          {history.length > 0 && <span className="skill-workshop-badge">{history.length}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="skill-workshop-content">
        {tab === 'pending' && (
          <>
            {pending.length === 0 ? (
              <div className="skill-workshop-empty">
                {corrections.length === 0 && memories.length === 0
                  ? t('workshop.noSignals')
                  : t('workshop.noProposals')}
              </div>
            ) : (
              <>
                {pending.length > 1 && (
                  <div className="skill-workshop-actions">
                    <button className="skill-workshop-approve-all-btn" onClick={handleApproveAll}>
                      ✅ {t('workshop.approveAll')}
                    </button>
                  </div>
                )}
                {pending.map((proposal) => (
                  <div key={proposal.id} className="skill-workshop-proposal">
                    {/* Proposal header */}
                    <div className="skill-workshop-proposal-header">
                      <div className="skill-workshop-proposal-meta">
                        <span className="skill-workshop-skill-name">
                          📦 {proposal.skillName}
                        </span>
                        <span
                          className="skill-workshop-confidence"
                          style={{ color: confidenceColor(0.7) }}
                          title={t('workshop.confidence')}
                        >
                          ◆ {Math.round(0.7 * 100)}%
                        </span>
                      </div>
                      <h4 className="skill-workshop-proposal-title">{proposal.title}</h4>
                    </div>

                    {/* Expandable diff */}
                    <button
                      className="skill-workshop-expand-btn"
                      onClick={() => setExpanded((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }))}
                    >
                      {expanded[proposal.id] ? '▾' : '▸'} {t('workshop.showDiff')}
                    </button>

                    {expanded[proposal.id] && (
                      <div className="skill-workshop-diff">
                        {proposal.hunks.map((hunk, i) => (
                          <div key={i} className="skill-workshop-hunk">
                            <div className="skill-workshop-hunk-label">{hunkTypeLabel(hunk.type)}</div>
                            <pre className="skill-workshop-diff-content">{formatDiff(hunk)}</pre>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="skill-workshop-proposal-actions">
                      <button className="skill-workshop-approve-btn" onClick={() => handleApprove(proposal.id)}>
                        ✅ {t('workshop.approve')}
                      </button>
                      <button className="skill-workshop-dismiss-btn" onClick={() => handleDismiss(proposal.id)}>
                        ✕ {t('workshop.dismiss')}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {history.length === 0 ? (
              <div className="skill-workshop-empty">{t('workshop.noHistory')}</div>
            ) : (
              history.map((proposal) => (
                <div key={proposal.id} className={`skill-workshop-history-item ${proposal.status}`}>
                  <div className="skill-workshop-history-meta">
                    <span className="skill-workshop-skill-name">📦 {proposal.skillName}</span>
                    <span className="skill-workshop-proposal-title" style={{ fontSize: '0.85em' }}>{proposal.title}</span>
                    <span className="skill-workshop-status-badge">
                      {proposal.status === 'approved' ? '✅ Approved' : '✕ Rejected'}
                    </span>
                  </div>
                  <div className="skill-workshop-history-date">
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
