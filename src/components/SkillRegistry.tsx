import { useState, useCallback, useEffect, useRef } from 'react'
import {
  SKILL_REGISTRY,
  SKILL_CATEGORIES,
  SKILL_CATEGORY_LABELS,
  SKILL_REGISTRY_COUNT,
} from '../data/skillRegistry'
import type { RegistrySkill } from '../data/skillRegistry'
import type { Skill } from '../types'
import { saveSkills } from '../lib/storage'
import { t } from '../lib/i18n'
import { PluginBindingModal } from './PluginBindingModal'

interface Props {
  onBack: () => void
  onInstall: (skill: RegistrySkill) => void
}

export function SkillRegistry({ onBack, onInstall }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [installCounts, setInstallCounts] = useState<Record<string, number>>({})
  const [pendingSkill, setPendingSkill] = useState<RegistrySkill | null>(null)
  const installRef = useRef<(skill: RegistrySkill) => void>(() => {})

  // Load installed skills + local install counts
  useEffect(() => {
    import('../lib/storage').then(({ loadSkills }) => {
      loadSkills().then((skills) => {
        setInstalledIds(new Set(skills.map((s) => s.id)))
      })
    })
    // Load local install counts from localStorage
    try {
      const raw = localStorage.getItem('monday-skill-install-counts')
      if (raw) setInstallCounts(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  const incrementInstallCount = useCallback((skillId: string) => {
    setInstallCounts((prev) => {
      const next = { ...prev, [skillId]: (prev[skillId] ?? 0) + 1 }
      try {
        localStorage.setItem('monday-skill-install-counts', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const handleInstall = useCallback(
    async (skill: RegistrySkill) => {
      const { saveSkills, loadSkills } = await import('../lib/storage')
      const existing = await loadSkills()
      if (!existing.find((s) => s.id === skill.id)) {
        const now = Date.now()
        const newSkill: Skill = {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          instructions: skill.instructions,
          requiredPlugins: skill.requiredPlugins,
          version: skill.version,
          tags: skill.tags,
          icon: skill.icon,
          createdAt: now,
          lastUsedAt: null,
          installCount: 0,
          author: skill.author ?? '',
        }
        await saveSkills([...existing, newSkill])
        setInstalledIds((prev) => new Set(prev).add(skill.id))
        incrementInstallCount(skill.id)
        onInstall(skill)
      }
    },
    [onInstall],
  )

  installRef.current = handleInstall

  const handleRegistryInstall = useCallback(
    async (skill: RegistrySkill) => {
      if (skill.requiredPlugins && skill.requiredPlugins.length > 0) {
        setPendingSkill(skill)
      } else {
        await handleInstall(skill)
      }
    },
    [handleInstall],
  )

  const handleInstallAll = useCallback(() => {
    if (pendingSkill) {
      installRef.current(pendingSkill)
      setPendingSkill(null)
    }
  }, [pendingSkill])

  const handleSkip = useCallback(() => {
    if (pendingSkill) {
      installRef.current(pendingSkill)
      setPendingSkill(null)
    }
  }, [pendingSkill])

  const handleCloseModal = useCallback(() => {
    setPendingSkill(null)
  }, [])

  const handleUninstall = useCallback(
    async (skillId: string) => {
      const { saveSkills, loadSkills, deleteSkill } = await import('../lib/storage')
      await deleteSkill(skillId)
      const existing = await loadSkills()
      setInstalledIds(new Set(existing.map((s) => s.id)))
    },
    [],
  )

  const filtered = SKILL_REGISTRY.filter((skill) => {
    if (activeCategory !== 'all' && skill.category !== activeCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        skill.name.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Sort: recommended first, then by name
  const sorted = [...filtered].sort((a, b) => {
    if (a.recommended && !b.recommended) return -1
    if (!a.recommended && b.recommended) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="skill-registry">
      <div className="skill-registry-header">
        <div className="skill-registry-title-area">
          <h2 className="skill-registry-title">
            {t('skillRegistry.title')}
          </h2>
          <p className="skill-registry-subtitle">
            {t('skillRegistry.subtitle', { count: SKILL_REGISTRY_COUNT })}
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="skill-registry-categories">
        {SKILL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`skill-registry-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {SKILL_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="skill-registry-search">
        <svg
          className="skill-registry-search-icon"
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
          className="skill-registry-search-input"
          placeholder={t('skillRegistry.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="skill-registry-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label={t('skillRegistry.clearSearch')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Results grid */}
      <div className="skill-registry-grid">
        {sorted.length === 0 ? (
          <div className="skill-registry-empty">
            {searchQuery
              ? `${t('skillRegistry.noResults')} "${searchQuery}"`
              : t('skillRegistry.noResultsCategory')}
          </div>
        ) : (
          sorted.map((skill) => {
            const isInstalled = installedIds.has(skill.id)
            return (
              <div key={skill.id} className="skill-registry-card">
                <div className="skill-registry-card-header">
                  <span className="skill-registry-card-icon">{skill.icon}</span>
                  <div className="skill-registry-card-info">
                    <h3 className="skill-registry-card-name">{skill.name}</h3>
                    <span className="skill-registry-card-category">
                      {SKILL_CATEGORY_LABELS[skill.category]?.replace(/^.\s*/, '')}
                    </span>
                    {skill.author && (
                      <span className="skill-registry-card-author">
                        by {skill.author}
                      </span>
                    )}
                  </div>
                  {skill.recommended && (
                    <span className="skill-registry-recommended-badge">
                      ⭐ {t('skillRegistry.recommended')}
                    </span>
                  )}
                  {installCounts[skill.id] > 0 && (
                    <span className="skill-registry-install-count">
                      {t('skillRegistry.installs', { count: installCounts[skill.id] })}
                    </span>
                  )}
                </div>
                <p className="skill-registry-card-desc">{skill.description}</p>
                <div className="skill-registry-card-tags">
                  {skill.tags.map((tag) => (
                    <span key={tag} className="skill-registry-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="skill-registry-card-actions">
                  {isInstalled ? (
                    <button
                      className="skill-registry-installed-btn"
                      onClick={() => handleUninstall(skill.id)}
                    >
                      ✓ {t('skillRegistry.installed')}
                    </button>
                  ) : (
                    <button
                      className="skill-registry-install-btn"
                      onClick={() => handleRegistryInstall(skill)}
                    >
                      {t('skillRegistry.install')}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Plugin binding modal */}
      {pendingSkill && (
        <PluginBindingModal
          skillName={pendingSkill.name}
          requiredPluginUrls={pendingSkill.requiredPlugins}
          onInstallAll={handleInstallAll}
          onSkip={handleSkip}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
