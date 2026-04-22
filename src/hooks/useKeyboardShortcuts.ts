import { useEffect, useCallback, useRef, useState } from 'react'

export interface CommandItem {
  id: string
  label: string
  shortcut?: string
  action: () => void
}

interface UseKeyboardShortcutsOptions {
  onNewChat?: () => void
  onStopGeneration?: () => void
  onOpenModels?: () => void
  onOpenCache?: () => void
  onOpenChangelog?: () => void
  onOpenStats?: () => void
  onResetRecommendations?: () => void
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const getFilteredCommands = useCallback((): CommandItem[] => {
    const commands: CommandItem[] = [
      ...(options.onNewChat
        ? [
            {
              id: 'new-chat',
              label: 'New Chat',
              shortcut: '⌘N',
              action: options.onNewChat,
            },
          ]
        : []),
      ...(options.onStopGeneration
        ? [
            {
              id: 'stop-generation',
              label: 'Stop Generation',
              shortcut: '⌘⇧S',
              action: options.onStopGeneration,
            },
          ]
        : []),
      ...(options.onOpenModels
        ? [
            {
              id: 'open-models',
              label: 'Open Models',
              shortcut: '⌘K',
              action: options.onOpenModels,
            },
          ]
        : []),
      ...(options.onOpenCache
        ? [
            {
              id: 'open-cache',
              label: 'Model Cache',
              action: options.onOpenCache,
            },
          ]
        : []),
      ...(options.onOpenChangelog
        ? [
            {
              id: 'open-changelog',
              label: 'Changelog',
              action: options.onOpenChangelog,
            },
          ]
        : []),
      ...(options.onOpenStats
        ? [
            {
              id: 'open-stats',
              label: 'Usage Statistics',
              action: options.onOpenStats,
            },
          ]
        : []),
      ...(options.onResetRecommendations
        ? [
            {
              id: 'reset-recommendations',
              label: 'Reset Model Recommendations',
              action: options.onResetRecommendations,
            },
          ]
        : []),
    ]

    if (!commandSearch) return commands

    const search = commandSearch.toLowerCase()
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(search),
    )
  }, [commandSearch, options])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const metaKey = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + K: Toggle command palette
      if (metaKey && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette((prev) => !prev)
        if (showCommandPalette) {
          setCommandSearch('')
        }
        return
      }

      // Cmd/Ctrl + N: New chat
      if (metaKey && e.key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        options.onNewChat?.()
        return
      }

      // Cmd/Ctrl + Shift + S: Stop generation
      if (metaKey && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        options.onStopGeneration?.()
        return
      }

      // Escape: Close command palette
      if (e.key === 'Escape' && showCommandPalette) {
        e.preventDefault()
        setShowCommandPalette(false)
        setCommandSearch('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCommandPalette, commandSearch, options])

  // Focus search input when palette opens
  useEffect(() => {
    if (showCommandPalette) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [showCommandPalette])

  return {
    showCommandPalette,
    setShowCommandPalette,
    commandSearch,
    setCommandSearch,
    searchRef,
    filteredCommands: getFilteredCommands(),
  }
}
