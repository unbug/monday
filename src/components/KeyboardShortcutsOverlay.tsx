/**
 * KeyboardShortcutsOverlay — a modal that lists every keyboard shortcut.
 * Opened with `?` or from the sidebar nav.
 */

import { useState, useEffect, useCallback } from 'react'

interface ShortcutGroup {
  category: string
  shortcuts: { key: string; label: string }[]
}

const GROUPS: ShortcutGroup[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { key: '⌘K', label: 'Command Palette' },
      { key: '⌘N', label: 'New Chat' },
      { key: '⌘⇧S', label: 'Stop Generation' },
    ],
  },
  {
    category: 'Views',
    shortcuts: [
      { key: '⌘1', label: 'Models' },
      { key: '⌘2', label: 'Model Cache' },
      { key: '⌘3', label: 'Usage Statistics' },
      { key: '⌘4', label: 'Persona Marketplace' },
      { key: '⌘5', label: 'Knowledge' },
    ],
  },
  {
    category: 'Tools',
    shortcuts: [
      { key: '⌘6', label: 'Model Comparison' },
      { key: '⌘7', label: 'Model Benchmark' },
      { key: '⌘8', label: 'Custom Model Import' },
      { key: '⌘9', label: 'Plugins' },
      { key: '⌘0', label: 'MCP Servers' },
    ],
  },
  {
    category: 'Data',
    shortcuts: [
      { key: '⌘⇧E', label: 'Export All Data' },
      { key: '⌘⇧I', label: 'Import Data' },
    ],
  },
]

export function KeyboardShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false)
        setTimeout(onClose, 200)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  return (
    <div className="shortcut-overlay" onClick={handleClose}>
      <div className="shortcut-overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-overlay-header">
          <span className="shortcut-overlay-title">Keyboard Shortcuts</span>
          <button className="shortcut-overlay-close" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="shortcut-overlay-body">
          {GROUPS.map((group) => (
            <div key={group.category} className="shortcut-group">
              <h3 className="shortcut-group-title">{group.category}</h3>
              <div className="shortcut-list">
                {group.shortcuts.map((s) => (
                  <div key={s.key} className="shortcut-item">
                    <kbd className="shortcut-key">{s.key}</kbd>
                    <span className="shortcut-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
