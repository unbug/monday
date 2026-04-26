import { useEffect, useCallback, useRef, useState } from 'react'

export interface CommandItem {
  id: string
  label: string
  icon?: string
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
  onOpenComparison?: () => void
  onOpenBenchmark?: () => void
  onOpenCustomModels?: () => void
  onResetRecommendations?: () => void
  onResetRecentModels?: () => void
  onOpenPersonaMarketplace?: () => void
  onOpenKnowledge?: () => void
  onOpenPlugins?: () => void
  onOpenMcpServers?: () => void
  onOpenWebDAV?: () => void
  onShare?: () => void
  onExportData?: () => Promise<void>
  onImportData?: (file: File) => Promise<void>
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
              icon: '✏️',
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
              icon: '⏹',
              shortcut: '⌘⇧S',
              action: options.onStopGeneration,
            },
          ]
        : []),
      ...(options.onOpenModels
        ? [
            {
              id: 'open-models',
              label: 'Models',
              icon: '🤖',
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
              icon: '🗄️',
              action: options.onOpenCache,
            },
          ]
        : []),
      ...(options.onOpenChangelog
        ? [
            {
              id: 'open-changelog',
              label: 'Changelog',
              icon: '📋',
              action: options.onOpenChangelog,
            },
          ]
        : []),
      ...(options.onOpenStats
        ? [
            {
              id: 'open-stats',
              label: 'Usage Statistics',
              icon: '📊',
              action: options.onOpenStats,
            },
          ]
        : []),
      ...(options.onOpenComparison
        ? [
            {
              id: 'open-comparison',
              label: 'Model Comparison',
              icon: '⚖️',
              action: options.onOpenComparison,
            },
          ]
        : []),
      ...(options.onOpenBenchmark
        ? [
            {
              id: 'open-benchmark',
              label: 'Model Benchmark',
              icon: '⚡',
              action: options.onOpenBenchmark,
            },
          ]
        : []),
      ...(options.onOpenCustomModels
        ? [
            {
              id: 'open-custom-models',
              label: 'Custom Model Import',
              icon: '📦',
              action: options.onOpenCustomModels,
            },
          ]
        : []),
      ...(options.onResetRecommendations
        ? [
            {
              id: 'reset-recommendations',
              label: 'Reset Model Recommendations',
              icon: '🔄',
              action: options.onResetRecommendations,
            },
          ]
        : []),
      ...(options.onResetRecentModels
        ? [
            {
              id: 'reset-recent-models',
              label: 'Reset Recent Models',
              icon: '🔁',
              action: options.onResetRecentModels,
            },
          ]
        : []),
      ...(options.onOpenPersonaMarketplace
        ? [
            {
              id: 'open-persona-marketplace',
              label: 'Persona Marketplace',
              icon: '🎭',
              action: options.onOpenPersonaMarketplace,
            },
          ]
        : []),
      ...(options.onOpenKnowledge
        ? [
            {
              id: 'open-knowledge',
              label: 'Knowledge',
              icon: '📚',
              action: options.onOpenKnowledge,
            },
          ]
        : []),
      ...(options.onOpenPlugins
        ? [
            {
              id: 'open-plugins',
              label: 'Plugins',
              icon: '🔌',
              action: options.onOpenPlugins,
            },
          ]
        : []),
      ...(options.onOpenMcpServers
        ? [
            {
              id: 'open-mcp-servers',
              label: 'MCP Servers',
              icon: '🌐',
              action: options.onOpenMcpServers,
            },
          ]
        : []),
      ...(options.onOpenWebDAV
        ? [
            {
              id: 'open-webdav',
              label: 'WebDAV Sync',
              icon: '🔄',
              action: options.onOpenWebDAV,
            },
          ]
        : []),
      ...(options.onShare
        ? [
            {
              id: 'share',
              label: 'Share Conversation',
              icon: '🔗',
              action: options.onShare,
            },
          ]
        : []),
      ...(options.onExportData
        ? [
            {
              id: 'export-data',
              label: 'Export All Data',
              icon: '📦',
              action: async () => { if (options.onExportData) await options.onExportData(); },
            },
          ]
        : []),
      ...(options.onImportData
        ? [
            {
              id: 'import-data',
              label: 'Import Data',
              icon: '📥',
              action: () => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.monday'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file && options.onImportData) await options.onImportData(file)
                }
                input.click()
              },
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
