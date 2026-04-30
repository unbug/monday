import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Skill } from '../types'
import { loadSkills, saveSkills, deleteSkill, onSkillsChanged } from '../lib/storage'
import { t } from '../lib/i18n'

interface Props {
  activeSkillIds: string[]
  onAttach: (skill: Skill) => void
  onDetach: (skillId: string) => void
}

export function SkillComposer({ activeSkillIds, onAttach, onDetach }: Props) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSkills().then((s) => {
      setSkills(s)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
    // Subscribe to skills-changed events for hot-reload
    return onSkillsChanged(() => {
      loadSkills().then((s) => setSkills(s))
    })
  }, [])

  const filteredSkills = useMemo(() => {
    if (!search.trim()) return skills
    const q = search.toLowerCase()
    return skills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((tag) => tag.toLowerCase().includes(q)),
    )
  }, [skills, search])

  const handleToggle = useCallback(
    (skill: Skill) => {
      const isActive = activeSkillIds.includes(skill.id)
      if (isActive) {
        onDetach(skill.id)
      } else {
        onAttach(skill)
      }
    },
    [activeSkillIds, onAttach, onDetach],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent, skillId: string) => {
      e.stopPropagation()
      deleteSkill(skillId)
      setSkills((prev) => prev.filter((s) => s.id !== skillId))
      onDetach(skillId)
    },
    [onDetach],
  )

  const categoryOrder = ['coding', 'writing', 'research', 'data', 'language', 'creative']

  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {}
    const uncategorized: Skill[] = []
    filteredSkills.forEach((skill) => {
      const cat = skill.tags[0] ?? 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(skill)
    })
    // Sort by category order, then uncategorized
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const ia = categoryOrder.indexOf(a)
      const ib = categoryOrder.indexOf(b)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    return sorted
  }, [filteredSkills])

  if (loading) {
    return (
      <div className="skill-composer">
        <div className="skill-composer-loading">{t('skill.loading')}</div>
      </div>
    )
  }

  return (
    <div className="skill-composer">
      <div className="skill-composer-header">
        <h3 className="skill-composer-title">{t('skill.title')}</h3>
        <p className="skill-composer-subtitle">{t('skill.subtitle')}</p>
      </div>

      <div className="skill-composer-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="skill-composer-search-input"
          placeholder={t('skill.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredSkills.length === 0 ? (
        <div className="skill-composer-empty">
          {search ? t('skill.noResults') : t('skill.empty')}
        </div>
      ) : (
        <div className="skill-composer-list">
          {groupedSkills.map(([category, categorySkills]) => (
            <div key={category} className="skill-composer-group">
              <div className="skill-composer-group-label">{t(`skill.category.${category}`) || category}</div>
              {categorySkills.map((skill) => {
                const isActive = activeSkillIds.includes(skill.id)
                return (
                  <div
                    key={skill.id}
                    className={`skill-chip ${isActive ? 'skill-chip--active' : ''}`}
                    onClick={() => handleToggle(skill)}
                  >
                    <span className="skill-chip-icon">{skill.icon}</span>
                    <span className="skill-chip-name">{skill.name}</span>
                    <span className="skill-chip-desc">{skill.description}</span>
                    <button
                      className="skill-chip-delete"
                      onClick={(e) => handleDelete(e, skill.id)}
                      title={t('skill.delete')}
                    >
                      ×
                    </button>
                    {isActive && <span className="skill-chip-check">✓</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
