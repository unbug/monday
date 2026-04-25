import { useState, useCallback, useEffect } from 'react'
import { BorderBeam } from 'border-beam'
import type { CommandItem } from '../hooks/useKeyboardShortcuts'

interface Props {
  show: boolean
  onClose: () => void
  search: string
  onSearchChange: (value: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  commands: CommandItem[]
}

export function CommandPalette({
  show,
  onClose,
  search,
  onSearchChange,
  searchRef,
  commands,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when commands list or visibility changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [commands.length, show])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(commands.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + Math.max(commands.length, 1)) % Math.max(commands.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = commands[selectedIndex]
        if (cmd) {
          cmd.action()
          onClose()
        }
      }
    },
    [commands, selectedIndex, onClose],
  )

  if (!show) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-border">
        <div className="command-palette" onClick={(e) => e.stopPropagation()}>
          <div className="command-palette-input-wrapper">
            <svg
              className="command-palette-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="command-palette-input"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <kbd className="command-palette-esc">ESC</kbd>
          </div>

          <div className="command-palette-list">
            {commands.length === 0 ? (
              <div className="command-palette-empty">No commands found</div>
            ) : (
              commands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  className={`command-palette-item${index === selectedIndex ? ' command-palette-item--selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    cmd.action()
                    onClose()
                  }}
                >
                  {cmd.icon && (
                    <span className="command-palette-item-icon">{cmd.icon}</span>
                  )}
                  <span className="command-palette-item-label">{cmd.label}</span>
                  {cmd.shortcut && (
                    <div className="command-palette-shortcut">
                      {cmd.shortcut.split('+').map((key, i) => (
                        <kbd key={i}>{key}</kbd>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
