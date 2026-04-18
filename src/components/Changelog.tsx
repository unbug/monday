import { useState } from 'react'
import { BorderBeam } from 'border-beam'
import { CHANGELOG, type ChangelogEntry } from '../lib/changelog'

export function Changelog() {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    CHANGELOG[0]?.version ?? null,
  )

  const typeLabel: Record<string, { label: string; color: string }> = {
    added: { label: 'Added', color: 'var(--color-added, #22c55e)' },
    changed: { label: 'Changed', color: 'var(--color-changed, #eab308)' },
    fixed: { label: 'Fixed', color: 'var(--color-fixed, #3b82f6)' },
    removed: { label: 'Removed', color: 'var(--color-removed, #ef4444)' },
  }

  return (
    <div className="changelog">
      <h2 className="changelog-title">Changelog</h2>
      <p className="changelog-desc">
        Track what's new, improved, and fixed in each release.
      </p>

      <div className="changelog-list">
        {CHANGELOG.map((entry: ChangelogEntry) => {
          const isExpanded = expandedVersion === entry.version
          return (
            <div key={entry.version} className="changelog-entry">
              <BorderBeam
                size="md"
                theme="auto"
                colorVariant={isExpanded ? 'ocean' : 'mono'}
                strength={isExpanded ? 0.6 : 0.2}
                active={isExpanded}
                duration={3}
              >
                <button
                  className={`changelog-header ${isExpanded ? 'changelog-header-active' : ''}`}
                  onClick={() =>
                    setExpandedVersion(isExpanded ? null : entry.version)
                  }
                >
                  <div className="changelog-header-left">
                    <span className="changelog-version">v{entry.version}</span>
                    <span className="changelog-date">{entry.date}</span>
                  </div>
                  <div className="changelog-header-right">
                    <span className="changelog-entry-title">{entry.title}</span>
                    <svg
                      className={`changelog-chevron ${isExpanded ? 'changelog-chevron-open' : ''}`}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>
              </BorderBeam>

              {isExpanded && (
                <div className="changelog-body">
                  <p className="changelog-description">{entry.description}</p>
                  <ul className="changelog-changes">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="changelog-change">
                        <span
                          className="changelog-badge"
                          style={{
                            backgroundColor: typeLabel[change.type].color,
                          }}
                        >
                          {typeLabel[change.type].label}
                        </span>
                        <span className="changelog-change-text">
                          {change.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
