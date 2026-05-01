import { useState, useEffect, useCallback, useRef } from 'react'
import { BorderBeam } from 'border-beam'
import { Sidebar } from './components/Sidebar'
import { ModelSelector } from './components/ModelSelector'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'
import { SettingsPanel } from './components/SettingsPanel'
import { WebGPUCheck } from './components/WebGPUCheck'
import { ThemeToggle } from './components/ThemeToggle'
import { Changelog } from './components/Changelog'
import { CommandPalette } from './components/CommandPalette'
import { ModelComparison } from './components/ModelComparison'
import { CodeArena } from './components/CodeArena'
import { ModelBenchmark } from './components/ModelBenchmark'
import { CustomModelImport } from './components/CustomModelImport'
import { PersonaMarketplace } from './components/PersonaMarketplace'
import { PERSONA_REGISTRY } from './data/personaRegistry'
import { KnowledgePanel } from './components/KnowledgePanel'
import { ToolCallInspector } from './components/ToolCallInspector'
import { PluginManager } from './components/PluginManager'
import { McpServerManager } from './components/McpServerManager'
import { UsageAnalytics } from './components/UsageAnalytics'
import { WebDAVSettings } from './components/WebDAVSettings'
import { AgentPanel } from './components/AgentPanel'
import { useAgentMode } from './hooks/useAgentMode'
import { QuickPrompts } from './components/QuickPrompts'
import { MemoryPanel } from './components/MemoryPanel'
import { PersistentMemoryPanel } from './components/PersistentMemoryPanel'
import { ProviderSwitcher, PROVIDERS } from './components/ProviderSwitcher'
import { useKnowledge } from './hooks/useKnowledge'
import { useKnowledgeBases } from './hooks/useKnowledgeBases'
import { useVectorStore } from './hooks/useVectorStore'
import { useMcpServers } from './hooks/useMcpServers'
import { useEmbeddingModel } from './hooks/useEmbeddingModel'
import { useModel } from './hooks/useModel'
import { useChat } from './hooks/useChat'
import { useTheme } from './hooks/useTheme'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate'
import { useOfflineStatus } from './hooks/useOfflineStatus'
import { useNotifications } from './hooks/useNotifications'
import { useMultiWindow } from './hooks/useMultiWindow'
import { PWAInstallBanner } from './components/PWAInstallBanner'
import { OfflineIndicator } from './components/OfflineIndicator'
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay'
import { UpdateBanner } from './components/UpdateBanner'
import { BatchGenerationPanel } from './components/BatchGenerationPanel'
import { SkillComposer } from './components/SkillComposer'
import { SkillRegistry } from './components/SkillRegistry'
import { OntologyPanel } from './components/OntologyPanel'
import { SkillBuilder } from './components/SkillBuilder'
import { LearningReviewDialog } from './components/LearningReviewDialog'
import type { ModelInfo, CitationEntry, Skill, LearningItem } from './types'
import type { SearXNGResult } from './lib/searxngApi'
import type { ImportResult } from './lib/dataImport'
import { PROMPT_TEMPLATES } from './lib/prompts'
import { getModelById, MODELS } from './lib/models'
import { shareSession } from './lib/shareExport'
import { exportMondayData } from './lib/dataExport'
import { importMondayData } from './lib/dataImport'
import { resetModelUsage } from './lib/modelUsage'
import { getRecentModels, resetRecentModels as resetRecent } from './lib/recentModels'
import { getLocale, setLocale, detectLocale, t } from './lib/i18n'
import { loadSkills } from './lib/storage'
import type { Locale } from './lib/i18n'
import './App.css'
import { useLocale } from './hooks/useLocale'

type View = 'chat' | 'models' | 'changelog' | 'cache' | 'arena' | 'benchmark' | 'custom-models' | 'persona-marketplace' | 'knowledge' | 'plugins' | 'mcp-servers' | 'webdav' | 'memory' | 'agent' | 'usage-analytics' | 'comparison' | 'skill-registry' | 'skill-builder' | 'ontology' | 'workshop'

const BASE = '/monday'

const VIEW_PATH: Record<View, string> = {
  chat: BASE + '/',
  models: BASE + '/models',
  changelog: BASE + '/changelog',
  cache: BASE + '/cache',
  arena: BASE + '/arena',
  benchmark: BASE + '/benchmark',
  'custom-models': BASE + '/custom-models',
  'persona-marketplace': BASE + '/persona-marketplace',
  knowledge: BASE + '/knowledge',
  plugins: BASE + '/plugins',
  'mcp-servers': BASE + '/mcp-servers',
  webdav: BASE + '/webdav',
  memory: BASE + '/memory',
  agent: BASE + '/agent',
  'usage-analytics': BASE + '/usage-analytics',
  comparison: BASE + '/comparison',
  'skill-registry': BASE + '/skill-registry',
  'skill-builder': BASE + '/skill-builder',
  ontology: BASE + '/ontology',
  workshop: BASE + '/workshop',
}

function viewFromPath(pathname: string): View {
  const norm = (p: string) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p)
  const entry = Object.entries(VIEW_PATH).find(([, p]) => norm(p) === norm(pathname))
  return (entry?.[0] as View) ?? 'chat'
}

export default function App() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [memories, setMemories] = useState<import('./types').MemoryEntry[]>([])
  // v1.2.3: pending learning items from compaction review
  const [pendingLearningItems, setPendingLearningItems] = useState<{
    summary: string
    items: LearningItem[]
    sessionId: string
  } | null>(null)
  const [view, setView] = useState<View>(() => {
    // Handle redirect encoded by 404.html on GitHub Pages
    const redirect = sessionStorage.getItem('redirect')
    if (redirect) {
      sessionStorage.removeItem('redirect')
      history.replaceState(null, '', redirect)
    }
    return viewFromPath(window.location.pathname)
  })

  // Sync view state → URL path (pushes a history entry so browser back/forward works)
  useEffect(() => {
    const target = VIEW_PATH[view]
    if (window.location.pathname !== target) history.pushState(null, '', target)
  }, [view])

  // Sync browser back/forward → view state
  useEffect(() => {
    const handler = () => setView(viewFromPath(window.location.pathname))
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [showComparison, setShowComparison] = useState(false)
  const [showPersonaMarketplace, setShowPersonaMarketplace] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  // v0.26: track which citation to highlight in knowledge panel
  const [citationHighlight, setCitationHighlight] = useState<{ docId: string; chunkIndex: number } | null>(null)
  // v0.28.1: import confirmation dialog
  const [importConfirm, setImportConfirm] = useState<{ file: File; stats: ImportResult } | null>(null)
  // v0.28.2: WebDAV sync toast
  const [webdavToast, setWebdavToast] = useState<{ success: boolean; message: string } | null>(null)
  // v0.29.3: keyboard shortcuts overlay
  const [showShortcuts, setShowShortcuts] = useState(false)
  // v0.30: agent mode panel
  const [showAgent, setShowAgent] = useState(false)
  // v0.30: agent input mode toggle (enables agent send from chat input)
  const [agentInputMode, setAgentInputMode] = useState(false)
  // v0.30.3: batch generation overlay
  const [showBatch, setShowBatch] = useState(false)
  const [batchPrompt, setBatchPrompt] = useState('')

  // a11y: screen-reader announcement
  const [announcement, setAnnouncement] = useState('')

  // v0.31: collapsible personas panel above chat input
  const [showPersonas, setShowPersonas] = useState(false)
  // v1.1: collapsible skills panel above chat input
  const [showSkills, setShowSkills] = useState(false)
  // v1.2: collapsible providers panel above chat input
  const [showProviders, setShowProviders] = useState(false)
  // v1.1.2: skill builder state
  const [skillBuilderSkill, setSkillBuilderSkill] = useState<Skill | null>(null)

  // v0.30.5: i18n locale
  const { locale, changeLocale: handleChangeLocale } = useLocale()
  const model = useModel()
  const chat = useChat(selectedModelId ?? '', {
    onGenerationComplete: (title, body) => {
      if (notifications.isTabHidden) {
        notifications.sendNotification(title, body)
      }
    },
  })
  const theme = useTheme()
  const knowledge = useKnowledge()
  const knowledgeBases = useKnowledgeBases(
    chat.activeSession?.knowledgeBaseId ?? null,
    (id) => chat.setKnowledgeBaseId(id),
  )
  const activeBaseDocIds = knowledgeBases.activeBaseId
    ? knowledgeBases.getBaseById(knowledgeBases.activeBaseId)?.docIds ?? []
    : null
  const vectorStore = useVectorStore()
  const embedding = useEmbeddingModel()
  const mcpServers = useMcpServers()

  // v1.2: load persistent memories and skills when memory view is open
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([])
  const [ontologyEntities, setOntologyEntities] = useState<import('./types').OntologyEntity[]>([])
  useEffect(() => {
    if (view === 'memory') {
      Promise.all([
        import('./lib/storage').then((m) => m.loadMemories()),
        loadSkills(),
      ]).then(([mems, sks]) => {
        setMemories(mems)
        setInstalledSkills(sks)
      })
    }
  }, [view])

  useEffect(() => {
    if (view === 'ontology') {
      import('./lib/storage').then((m) => m.loadOntologyEntities()).then((ents) => setOntologyEntities(ents))
    }
  }, [view])

  // Apply base filter to vector store when active base changes
  useEffect(() => {
    vectorStore.setBaseFilter(activeBaseDocIds ?? null)
  }, [activeBaseDocIds, vectorStore])

  // Trigger theme transition overlay
  const prevThemeRef = useRef<string>(theme.resolved)
  useEffect(() => {
    if (prevThemeRef.current !== theme.resolved) {
      setTransitioning(true)
      const timer = setTimeout(() => setTransitioning(false), 400)
      prevThemeRef.current = theme.resolved
      return () => clearTimeout(timer)
    }
  }, [theme.resolved])

  const activePersonaId = chat.activeSession?.personaId ?? null
  // v1.1: active skills for header chips
  const activeSkillsRef = useRef<Skill[]>([])
  useEffect(() => {
    if (chat.activeSession?.skillIds?.length) {
      loadSkills().then((all) => {
        activeSkillsRef.current = chat.activeSession!.skillIds!
          .map((id) => all.find((s) => s.id === id))
          .filter((s): s is Skill => !!s)
      }).catch(() => {
        activeSkillsRef.current = []
      })
    } else {
      activeSkillsRef.current = []
    }
  }, [chat.activeSession?.skillIds])
  // v0.29.3: multi-window support
  const multiWindow = useMultiWindow()
  // v0.30: agent mode
  const agentMode = useAgentMode({
    onAgentResult: (result) => {
      // Append agent result as assistant message in current session
      const sid = chat.activeSession?.id
      if (sid && result.trim()) {
        const agentMsg = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `🤖 **Agent Result**\n\n${result.trim()}`,
          isStreaming: false,
          timestamp: Date.now(),
        }
        const updatedSessions = chat.sessions.map((s) =>
          s.id === sid
            ? { ...s, messages: [...s.messages, agentMsg], updatedAt: Date.now() }
            : s,
        )
        chat.updateSessions(updatedSessions)
      }
    },
  })

  useEffect(() => {
    chat.initSessions()
  }, [chat.initSessions])

  // Auto-load the most recently used model that is already cached
  useEffect(() => {
    if (model.status !== 'idle' || selectedModelId) return
    const recents = getRecentModels(10)
    const cached = recents.find((id) => model.downloadedModelIds.has(id))
    if (cached) {
      setSelectedModelId(cached)
      model.load(cached)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.downloadedModelIds])

  // v0.29.3: handle child window — auto-select the target session
  useEffect(() => {
    if (multiWindow.isChildWindow && multiWindow.childSessionId) {
      chat.switchSession(multiWindow.childSessionId)
    }
  }, [multiWindow.isChildWindow, multiWindow.childSessionId, chat])

  // v0.29.3: `?` to open keyboard shortcuts overlay
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setShowShortcuts((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleSelectModel = useCallback(
    async (info: ModelInfo) => {
      setSelectedModelId(info.id)
      await model.load(info.id)
      setView('chat')
    },
    [model],
  )

  const handleCustomModelLoad = useCallback(
    async (modelId: string) => {
      setSelectedModelId(modelId)
      await model.load(modelId)
      setView('chat')
    },
    [model],
  )

  const handleResetRecommendations = useCallback(() => {
    resetModelUsage()
  }, [])

  // v0.28: share current conversation as static HTML
  const handleShare = useCallback(() => {
    if (chat.activeSession) {
      shareSession(chat.activeSession)
    }
  }, [chat.activeSession])

  // v0.28.1: export all data as .monday file
  const handleExportData = useCallback(async () => {
    await exportMondayData('0.28.1')
  }, [])

  // v0.28.1: import data from .monday file
  const handleImportData = useCallback(async (file: File) => {
    const result = await importMondayData(file, false)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.message)
    }
  }, [])

  // v1.0.7: SearXNG web search state
  const [searchContext, setSearchContext] = useState<string | null>(null)

  const handleSend = useCallback(
    async (content: string, images?: Array<{ id: string; data: string; name?: string }>, files?: Array<{ id: string; name: string; size: number; type: string; content: string }>) => {
      // Trigger SearXNG search if enabled and no results yet
      let searchCtx = searchContext
      if (chat.searxngUrl && chat.isSearching === false && chat.searchResults === null && content.trim()) {
        try {
          const results = await chat.toggleSearch(content)
          if (results && results.length > 0) {
            searchCtx = (results as SearXNGResult[]).map((r) => `[${r.title}](${r.url})\n${r.content}`).join('\n\n---\n\n')
          }
        } catch {
          // Search failed — send without search context
          searchCtx = null
        }
      }
      setSearchContext(searchCtx)
      chat.sendMessage(content, searchCtx ?? undefined, images, files, knowledgeBases.activeBaseId ?? undefined)
    },
    [chat, knowledgeBases.activeBaseId, searchContext],
  )

  // v0.30.3: batch generation
  const handleOpenBatch = useCallback((content: string) => {
    setBatchPrompt(content)
    setShowBatch(true)
  }, [])

  const handleBatchPick = useCallback((content: string, modelId: string) => {
    if (!chat.activeSession) return
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content,
      isStreaming: false,
      timestamp: Date.now(),
    }
    const updatedSessions = chat.sessions.map((s) =>
      s.id === chat.activeSession!.id
        ? { ...s, messages: [...s.messages, assistantMsg], updatedAt: Date.now() }
        : s,
    )
    chat.updateSessions(updatedSessions)
    setShowBatch(false)
    setBatchPrompt('')
  }, [chat])

  const handleBatchDiscard = useCallback(() => {
    setShowBatch(false)
    setBatchPrompt('')
  }, [])

  const handleNewChat = useCallback(() => {
    chat.newSession()
    setView('chat')
  }, [chat])

  // v0.26: citation click handler — switch to knowledge panel, highlight the source
  const handleCitationClick = useCallback(
    (citation: CitationEntry) => {
      setCitationHighlight({ docId: citation.docId, chunkIndex: citation.chunkIndex })
      setView('knowledge')
    },
    [],
  )

  const keyboard = useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onStopGeneration: chat.stopGenerating,
    onOpenModels: () => setView('models'),
    onOpenCache: () => setView('cache'),
    onOpenChangelog: () => setView('changelog'),
    onOpenArena: () => setView('arena'),
    onOpenBenchmark: () => setView('benchmark'),
    onOpenCustomModels: () => setView('custom-models'),
    onResetRecommendations: () => handleResetRecommendations(),
    onResetRecentModels: () => resetRecent(),
    onOpenPersonaMarketplace: () => setView('persona-marketplace'),
    onOpenKnowledge: () => setView('knowledge'),
    onOpenPlugins: () => setView('plugins'),
    onOpenMcpServers: () => setView('mcp-servers'),
    onOpenWebDAV: () => setView('webdav'),
    onOpenMemory: () => setView('memory'),
    onOpenAgent: () => setView('agent'),
    onOpenUsageAnalytics: () => setView('usage-analytics'),
    onOpenComparison: () => setView('comparison'),
    onOpenSkillRegistry: () => setView('skill-registry'),
    onOpenSkillBuilder: () => { setSkillBuilderSkill(null); setView('skill-builder'); },
    onPublishPersona: () => setView('persona-marketplace'),
    onShare: handleShare,
    onExportData: handleExportData,
    onImportData: handleImportData,
    onOpenShortcuts: () => setShowShortcuts(true),
  })

  const isReady = model.status === 'ready'
  const { canInstall, promptInstall, onDismiss } = useInstallPrompt()
  // v0.29: detect new service worker and prompt reload
  const { hasUpdate, onActivate } = useServiceWorkerUpdate()
  const { online } = useOfflineStatus()
  const notifications = useNotifications()
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const updateVisible = hasUpdate && !updateDismissed
  const handleUpdateDismiss = useCallback(() => setUpdateDismissed(true), [])

  const modelBadgeText = selectedModelId
    ? selectedModelId.split('-').slice(0, 2).join(' ')
    : ''

  const closeSidebarOnMobile = useCallback(() => {
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }, [])

  return (
    <div className="app">
      {/* a11y: skip to main content */}
      <a href="#main-content" className="skip-link">
        {t('a11y.skipToContent')}
      </a>

      {/* a11y: live region for screen-reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Theme transition overlay */}
      {transitioning && (
        <div className={`theme-transition-overlay ${transitioning ? 'active' : ''}`} />
      )}

      {sidebarOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          <Sidebar
            sessions={chat.sessions}
            activeSessionId={chat.activeSession?.id ?? null}
            onSelect={(id) => {
              chat.switchSession(id)
              setView('chat')
              closeSidebarOnMobile()
            }}
            onNew={() => {
              handleNewChat()
              closeSidebarOnMobile()
            }}
            onDelete={chat.deleteSession}
            onVersionClick={() => {
              setView('changelog')
              closeSidebarOnMobile()
            }}
            onOpenArena={() => {
              setView('arena')
              closeSidebarOnMobile()
            }}
            onOpenBenchmark={() => {
              setView('benchmark')
              closeSidebarOnMobile()
            }}
            onOpenCustomModels={() => {
              setView('custom-models')
              closeSidebarOnMobile()
            }}
            onOpenPersonaMarketplace={() => {
              setView('persona-marketplace')
              closeSidebarOnMobile()
            }}
            onOpenSkillRegistry={() => {
              setView('skill-registry')
              closeSidebarOnMobile()
            }}
            onOpenSkillBuilder={() => {
              setSkillBuilderSkill(null)
              setView('skill-builder')
              closeSidebarOnMobile()
            }}
            onOpenKnowledge={() => {
              setView('knowledge')
              closeSidebarOnMobile()
            }}
            onOpenPlugins={() => {
              setView('plugins')
              closeSidebarOnMobile()
            }}
            onOpenMcpServers={() => {
              setView('mcp-servers')
              closeSidebarOnMobile()
            }}
            onOpenWebDAV={() => {
              setView('webdav')
              closeSidebarOnMobile()
            }}
            onOpenMemory={() => {
              setView('memory')
              closeSidebarOnMobile()
            }}
            onOpenAgent={() => {
              setView('agent')
              closeSidebarOnMobile()
            }}
            onOpenUsageAnalytics={() => {
              setView('usage-analytics')
              closeSidebarOnMobile()
            }}
            onOpenComparison={() => {
              setView('comparison')
              closeSidebarOnMobile()
            }}
            onOpenOntology={() => {
              setView('ontology')
              closeSidebarOnMobile()
            }}
            onOpenShortcuts={() => {
              setShowShortcuts(true)
              closeSidebarOnMobile()
            }}
            onOpenInNewWindow={multiWindow.openInNewWindow}
            onShare={() => {
              handleShare()
              closeSidebarOnMobile()
            }}
            shareSession={shareSession}
            onUpdateSession={(updated) => {
              const idx = chat.sessions.findIndex((s) => s.id === updated.id)
              if (idx !== -1) {
                const updatedSessions = [...chat.sessions]
                updatedSessions[idx] = updated
                chat.updateSessions(updatedSessions)
              }
            }}
            onImport={handleImportData}
            onExport={handleExportData}
            locale={locale}
            onChangeLocale={handleChangeLocale}
            highContrast={theme.highContrast}
            onToggleHighContrast={(hc) => theme.setHighContrast(hc)}
            // v1.0.0: provider
            provider={chat.activeSession?.provider ?? null}
            onSetProvider={chat.setProvider}
            // v1.2.1: correction capture
            correctionCaptureEnabled={chat.correctionCaptureEnabled}
            onToggleCorrectionCapture={() => chat.setCorrectionCaptureEnabled((prev: boolean) => {
              const next = !prev
              try { localStorage.setItem('monday-correction-capture', String(next)) }
              catch { /* best-effort */ }
              return next
            })}
          />
        </>
      )}

      {/* WebDAV sync toast */}
      {webdavToast && (
        <div className={`webdav-toast ${webdavToast.success ? 'webdav-toast-ok' : 'webdav-toast-error'}`}>
          <span>{webdavToast.message}</span>
          <button className="webdav-toast-close" onClick={() => setWebdavToast(null)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <CommandPalette
        show={keyboard.showCommandPalette}
        onClose={() => {
          keyboard.setShowCommandPalette(false)
          keyboard.setCommandSearch('')
        }}
        search={keyboard.commandSearch}
        onSearchChange={keyboard.setCommandSearch}
        searchRef={keyboard.searchRef}
        commands={keyboard.filteredCommands}
      />

      {/* v0.29: update prompt banner */}
      {updateVisible && (
        <UpdateBanner onReload={onActivate} onDismiss={handleUpdateDismiss} />
      )}

      {/* v0.29.3: keyboard shortcuts overlay */}
      {showShortcuts && (
        <KeyboardShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}

      <main id="main-content" className="main" role="main">
        <header className="header" role="banner">
          <button
            className="header-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="header-center">
            {selectedModelId && model.status === 'ready' && (
              <BorderBeam size="sm" theme="auto" colorVariant="ocean" strength={0.5} duration={3}>
                <span className="header-model-badge">
                  <span className="header-model-dot" />
                  {modelBadgeText}
                </span>
              </BorderBeam>
            )}
            {model.status === 'downloading' && (
              <BorderBeam size="sm" theme="auto" colorVariant="colorful" strength={0.6} duration={1.5} active>
                <span className="header-loading">
                  Loading model... {model.progress}%
                </span>
              </BorderBeam>
            )}
            {chat.activeSession?.skillIds && chat.activeSession.skillIds.length > 0 && (
              <div className="header-skills">
                {chat.activeSession.skillIds.map((skillId) => {
                  const skill = activeSkillsRef.current?.find((s) => s.id === skillId)
                  if (!skill) return null
                  return (
                    <span
                      key={skillId}
                      className="header-skill-chip"
                      title={skill.description}
                    >
                      {skill.icon} {skill.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <ThemeToggle mode={theme.mode} onChange={theme.setMode} />

          <button
            className="header-models-btn"
            onClick={() => setView(view === 'models' ? 'chat' : 'models')}
          >
            {view === 'models' ? 'Chat' : 'Models'}
          </button>

          <button
            className="header-shortcut-hint"
            onClick={() => keyboard.setShowCommandPalette(true)}
            title="Command Palette"
          >
            <span className="header-shortcut-key">⌘</span><span className="header-shortcut-key">K</span>
          </button>
        </header>

        <WebGPUCheck supported={model.webgpuSupported} />

        {canInstall && (
          <div className="install-banner-wrapper">
            <PWAInstallBanner onInstall={promptInstall} onDismiss={onDismiss} />
          </div>
        )}

        {view === 'models' ? (
          <div className="main-content">
            <ModelSelector
              currentModelId={selectedModelId}
              modelState={{
                status: model.status,
                progress: model.progress,
                error: model.error,
              }}
              downloadedModelIds={model.downloadedModelIds}
              onSelect={handleSelectModel}
              onOpenCache={() => setView('cache')}
              onResetRecommendations={handleResetRecommendations}
              onResetRecentModels={() => resetRecent()}
              onOpenBenchmark={() => setView('benchmark')}
              onOpenCustomModels={() => setView('custom-models')}
              onOpenPersonaMarketplace={() => setView('persona-marketplace')}
            />
          </div>
        ) : view === 'changelog' ? (
          <div className="main-content">
            <Changelog />
          </div>
        ) : view === 'cache' ? (
          <div className="main-content">
            <ModelSelector
              currentModelId={selectedModelId}
              modelState={{
                status: model.status,
                progress: model.progress,
                error: model.error,
              }}
              downloadedModelIds={model.downloadedModelIds}
              onSelect={handleSelectModel}
              onOpenCache={() => setView('cache')}
              showCacheManager
            />
          </div>
        ) : view === 'arena' ? (
          <div className="main-content main-content--arena">
            <CodeArena onBack={() => setView('models')} />
          </div>
        ) : view === 'benchmark' ? (
          <div className="main-content main-content--benchmark">
            <ModelBenchmark onBack={() => setView('models')} />
          </div>
        ) : view === 'custom-models' ? (
          <div className="main-content main-content--custom-models">
            <CustomModelImport onLoad={handleCustomModelLoad} />
          </div>
        ) : view === 'persona-marketplace' ? (
          <div className="main-content main-content--persona-marketplace">
            <PersonaMarketplace
              onBack={() => setView('chat')}
              onApplyPersona={(persona) => {
                chat.applyPersona(persona)
                setView('chat')
              }}
            />
          </div>
        ) : view === 'knowledge' ? (
          <div className="main-content main-content--knowledge">
            <KnowledgePanel
              docs={knowledge.docs}
              loading={knowledge.loading}
              error={knowledge.error}
              onUpload={knowledge.uploadFiles}
              onRemove={knowledge.removeDoc}
              onClear={knowledge.clearDocs}
              onBack={() => {
                setCitationHighlight(null)
                setView('chat')
              }}
              indexing={vectorStore.indexing}
              indexedCount={vectorStore.indexedCount}
              results={vectorStore.results}
              query={vectorStore.query}
              onQueryChange={vectorStore.setQuery}
              onIndexDocs={vectorStore.indexDocs}
              onClearIndex={vectorStore.clearIndex}
              hasIndex={vectorStore.hasIndex}
              baseDocIds={activeBaseDocIds}
              bases={knowledgeBases.bases}
              activeBaseId={knowledgeBases.activeBaseId}
              onCreateBase={knowledgeBases.createBase}
              onRenameBase={knowledgeBases.renameBase}
              onDeleteBase={knowledgeBases.deleteBase}
              onSetActiveBase={knowledgeBases.setActiveBaseId}
              onAddDocToBase={knowledgeBases.addDocToBase}
              onRemoveDocFromBase={knowledgeBases.removeDocFromBase}
              // v0.26: citation highlight
              highlightDocId={citationHighlight?.docId ?? null}
              highlightChunkIndex={citationHighlight?.chunkIndex ?? -1}
              // v0.26.0: embedding model
              embeddingLoaded={embedding.isLoaded}
              embeddingProgress={embedding.progress}
              embeddingError={embedding.error}
              onEmbeddingLoad={embedding.load}
              onEmbeddingUnload={embedding.unload}
            />
          </div>
        ) : view === 'plugins' ? (
          <div className="main-content main-content--plugins">
            <PluginManager onBack={() => setView('chat')} offline={!online} />
          </div>
        ) : view === 'mcp-servers' ? (
          <div className="main-content main-content--mcp-servers">
            <McpServerManager onBack={() => setView('chat')} offline={!online} />
          </div>
        ) : view === 'webdav' ? (
          <div className="main-content main-content--webdav">
            <WebDAVSettings
              onBack={() => setView('chat')}
              onSyncComplete={(success, message) => setWebdavToast({ success, message })}
              offline={!online}
            />
          </div>
        ) : view === 'memory' ? (
          <div className="main-content main-content--memory">
            <MemoryPanel
              summaries={chat.activeSession?.summaries ?? []}
              isSummarizing={chat.memory.isSummarizing}
              summarizeProgress={chat.memory.summarizeProgress}
              needsSummarization={chat.memory.needsSummarization}
              estimatedTokens={chat.memory.estimatedTokens}
              onCompress={async () => {
                await chat.memory.compressEarlyTurns(chat.messages)
              }}
              onCancelCompress={chat.memory.cancelSummarization}
              onEditSummary={chat.memory.editSummary}
              onDeleteSummary={chat.memory.deleteSummary}
              onClose={() => setView('chat')}
            />
            <PersistentMemoryPanel
              memories={memories}
              personas={PERSONA_REGISTRY}
              skills={installedSkills}
              onAdd={async (key, value, namespace, targetId) => {
                const m = await import('./lib/storage')
                const mem = await m.createMemory(key, value, namespace, targetId, chat.activeSession?.id ?? 'unknown')
                setMemories((prev) => [mem, ...prev])
              }}
              onEdit={async (id, key, value) => {
                await import('./lib/storage').then((m) => m.updateMemory(id, key, value))
                setMemories((prev) => prev.map((m) => m.id === id ? { ...m, key, value, updatedAt: Date.now() } : m))
              }}
              onDelete={async (id) => {
                await import('./lib/storage').then((m) => m.deleteMemory(id))
                setMemories((prev) => prev.filter((m) => m.id !== id))
              }}
              onClose={() => setView('chat')}
            />
            {/* v1.2.3: learning review dialog */}
            {chat.pendingLearningItems && (
              <LearningReviewDialog
                items={chat.pendingLearningItems.items}
                summary={chat.pendingLearningItems.summary}
                onApproveAll={async () => {
                  const result = chat.pendingLearningItems
                  if (!result) return
                  const approvedItems = result.items.filter((i) => true)
                  if (approvedItems.length > 0) {
                    const m = await import('./lib/storage')
                    const newMemories: typeof memories = []
                    for (const item of approvedItems) {
                      const mem = await m.createMemory(
                        item.title,
                        item.content,
                        item.type === 'preference' ? 'global' : 'skill',
                        null,
                        result.sessionId,
                      )
                      newMemories.push(mem)
                    }
                    setMemories((prev) => [...newMemories, ...prev])
                  }
                  chat.setPendingLearningItems(null)
                }}
                onDismiss={() => {
                  chat.setPendingLearningItems(null)
                }}
              />
            )}
          </div>
        ) : view === 'ontology' ? (
          <div className="main-content main-content--ontology">
            <OntologyPanel
              entities={ontologyEntities}
              onAdd={async (type, name, props) => {
                const m = await import('./lib/storage')
                const ent = await m.createOntologyEntity(type, name, props)
                setOntologyEntities((prev) => [ent, ...prev])
              }}
              onEdit={async (id, name, props) => {
                await import('./lib/storage').then((m) => m.updateOntologyEntity(id, name, props))
                setOntologyEntities((prev) => prev.map((e) => e.id === id ? { ...e, name, properties: props, updatedAt: Date.now() } : e))
              }}
              onDelete={async (id) => {
                await import('./lib/storage').then((m) => m.deleteOntologyEntity(id))
                setOntologyEntities((prev) => prev.filter((e) => e.id !== id))
              }}
              onAddRelationship={async (fromId, toId, label) => {
                await import('./lib/storage').then((m) => m.addEntityRelationship(fromId, toId, label))
                setOntologyEntities((prev) => prev.map((e) => e.id === fromId ? { ...e, relationships: [...e.relationships, toId], updatedAt: Date.now() } : e))
              }}
              onRemoveRelationship={async (fromId, toId) => {
                await import('./lib/storage').then((m) => m.removeEntityRelationship(fromId, toId))
                setOntologyEntities((prev) => prev.map((e) => e.id === fromId ? { ...e, relationships: e.relationships.filter((r) => r !== toId), updatedAt: Date.now() } : e))
              }}
              onInjectAsContext={() => {
                import('./lib/storage').then((m) => {
                  const ctx = ontologyEntities.map((e) => `[${e.type}] ${e.name}${Object.keys(e.properties).length > 0 ? ' {' + Object.entries(e.properties).map(([k, v]) => ` ${k}: ${v}`).join(', ') + ' }' : ''}`).join('; ')
                  navigator.clipboard.writeText(ctx)
                })
              }}
              onClose={() => setView('chat')}
            />
          </div>
        ) : view === 'usage-analytics' ? (
          <div className="main-content main-content--usage-analytics">
            <UsageAnalytics />
          </div>
        ) : view === 'comparison' ? (
          <div className="main-content main-content--comparison">
            <ModelComparison />
          </div>
        ) : view === 'agent' ? (
          <div className="agent-view">
            {agentMode.state.task ? (
              <AgentPanel
                task={agentMode.state.task}
                onStop={agentMode.stop}
                onClose={() => {
                  setShowAgent(false)
                  setView('chat')
                }}
              />
            ) : (
              <div className="agent-empty-state">
                <div className="agent-empty-icon">🤖</div>
                <h2 className="agent-empty-title">Agent Mode</h2>
                <p className="agent-empty-desc">Send a message from the chat to start an agent task.</p>
                <button className="agent-empty-back-btn" onClick={() => setView('chat')}>
                  Back to Chat
                </button>
              </div>
            )}
          </div>
        ) : view === 'skill-registry' ? (
          <div className="main-content main-content--skill-registry">
            <SkillRegistry
              onBack={() => setView('chat')}
              onInstall={(skill) => {
                // Skill installed — user can attach it from the skill composer
              }}
            />
          </div>
        ) : view === 'skill-builder' ? (
          <div className="main-content main-content--skill-builder">
            <SkillBuilder
              onBack={() => setView('chat')}
              initialSkill={skillBuilderSkill}
              onSave={() => setView('skill-registry')}
            />
          </div>
        ) : showBatch ? (
          <div className="chat-layout">
            <div className="chat-messages">
              <MessageList
                messages={chat.messages}
                isStreaming={chat.isGenerating}
                modelStatus={model.status}
                hasCachedModels={model.downloadedModelIds.size > 0}
                onGoToModels={() => setView('models')}
                onRegenerateMessage={(id) => {
                  const session = chat.activeSession
                  if (session) {
                    const msg = session.messages.find((m) => m.id === id)
                    if (msg) chat.regenerateMessage(msg.id)
                  }
                }}
                onEditMessage={(id, content) => chat.editMessage(id, content)}
                onCitationClick={handleCitationClick}
                onFork={(msgIndex) => {
                  const session = chat.activeSession
                  if (session && session.messages[msgIndex]) {
                    chat.forkSession(session.id, msgIndex)
                  }
                }}
              />
            </div>
            <div className="batch-generation-overlay">
              <BatchGenerationPanel
                prompt={batchPrompt}
                modelId={selectedModelId ?? ''}
                modelInfo={getModelById(selectedModelId ?? '') ?? null}
                generationParams={chat.activeSession?.generationParams ?? { temperature: 0.7, top_p: 0.9, maxTokens: 1024 }}
                systemPrompt={chat.activeSession?.systemPrompt ?? ''}
                onPickResponse={handleBatchPick}
                onDiscardAll={handleBatchDiscard}
                onBack={handleBatchDiscard}
                tokenStats={chat.tokenStats}
                isStreaming={chat.isStreaming}
                knowledgeBaseName={knowledgeBases.activeBaseId
                  ? knowledgeBases.getBaseById(knowledgeBases.activeBaseId)?.name ?? null
                  : null}
                knowledgeContextCount={chat.knowledgeContextCount}
              />
            </div>
          </div>
        ) : (
          <div className="chat-layout">
            <div className="chat-messages">
              <MessageList
                messages={chat.messages}
                isStreaming={chat.isGenerating}                modelStatus={model.status}
                hasCachedModels={model.downloadedModelIds.size > 0}
                onGoToModels={() => setView('models')}                onRegenerateMessage={(id) => {
                  const session = chat.activeSession
                  if (session) {
                    const msg = session.messages.find((m) => m.id === id)
                    if (msg) chat.regenerateMessage(msg.id)
                  }
                }}
                onEditMessage={(id, content) => chat.editMessage(id, content)}
                onCitationClick={handleCitationClick}
                onFork={(msgIndex) => {
                  const session = chat.activeSession
                  if (session && session.messages[msgIndex]) {
                    chat.forkSession(session.id, msgIndex)
                  }
                }}
              />
              <ToolCallInspector
                events={chat.toolCallEvents ?? []}
                isProcessing={chat.isGenerating}
                onCollapse={() => {}}
              />
            </div>
            {chat.activeSession && (
              <div className="chat-personas">
                <button
                  className={`chat-personas-toggle ${showPersonas ? 'chat-personas-toggle--open' : ''} ${activePersonaId ? 'chat-personas-toggle--active' : ''}`}
                  onClick={() => setShowPersonas((v) => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Personas{activePersonaId ? ' ●' : ''}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="chat-personas-chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showPersonas && (
                  <QuickPrompts
                    activePersonaId={activePersonaId ?? null}
                    onApplyPersona={(persona) => {
                      chat.applyPersona(persona)
                    }}
                    onClearPersona={() => {
                      chat.clearPersona()
                    }}
                    systemPrompt={chat.activeSession?.systemPrompt ?? ''}
                    onUpdateSystemPrompt={(prompt) => {
                      const session = chat.activeSession
                      if (!session) return
                      const updated = [...chat.sessions]
                      const idx = updated.findIndex((s) => s.id === session.id)
                      if (idx !== -1) {
                        updated[idx] = { ...session, systemPrompt: prompt, updatedAt: Date.now() }
                        chat.updateSessions(updated)
                      }
                    }}
                  />
                )}
              </div>
            )}
            {/* v1.1: collapsible skills panel */}
            {chat.activeSession && (
              <div className="chat-skills">
                <button
                  className={`chat-skills-toggle ${showSkills ? 'chat-skills-toggle--open' : ''} ${chat.activeSession.skillIds?.length ? 'chat-skills-toggle--active' : ''}`}
                  onClick={() => setShowSkills((v) => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span>Skills{chat.activeSession.skillIds?.length ? ` ● ${chat.activeSession.skillIds.length}` : ''}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="chat-skills-chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showSkills && (
                  <SkillComposer
                    activeSkillIds={chat.activeSession.skillIds ?? []}
                    onAttach={(skill) => {
                      const session = chat.activeSession
                      if (!session) return
                      const updated = [...chat.sessions]
                      const idx = updated.findIndex((s) => s.id === session.id)
                      if (idx !== -1) {
                        const existing = updated[idx].skillIds ?? []
                        if (!existing.includes(skill.id)) {
                          updated[idx] = { ...session, skillIds: [...existing, skill.id], updatedAt: Date.now() }
                          chat.updateSessions(updated)
                        }
                      }
                    }}
                    onDetach={(skillId) => {
                      const session = chat.activeSession
                      if (!session) return
                      const updated = [...chat.sessions]
                      const idx = updated.findIndex((s) => s.id === session.id)
                      if (idx !== -1) {
                        updated[idx] = {
                          ...session,
                          skillIds: (session.skillIds ?? []).filter((id) => id !== skillId),
                          updatedAt: Date.now(),
                        }
                        chat.updateSessions(updated)
                      }
                    }}
                  />
                )}
              </div>
            )}
            {/* providers panel — same pattern as Personas / Skills */}
            {chat.activeSession && (
              <div className="chat-providers">
                <button
                  className={`chat-providers-toggle ${showProviders ? 'chat-providers-toggle--open' : ''} ${chat.activeSession.provider ? 'chat-providers-toggle--active' : ''}`}
                  onClick={() => setShowProviders((v) => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                  </svg>
                  <span>Provider{chat.activeSession.provider ? ' ●' : ''}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="chat-providers-chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showProviders && (
                  <div className="chat-providers-panel">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id ?? 'local'}
                        className={`chat-provider-chip ${chat.activeSession?.provider === p.id ? 'chat-provider-chip--active' : ''}`}
                        onClick={() => {
                          chat.setProvider(p.id)
                          setShowProviders(false)
                        }}
                        type="button"
                        title={p.desc}
                      >
                        <span className="chat-provider-chip-icon">{p.icon}</span>
                        <span className="chat-provider-chip-label">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ChatInput
              onSend={handleSend}
              onBatchSend={handleOpenBatch}
              onStop={chat.stopGenerating}
              onApplyPersona={(personaId) => {
                const persona = PROMPT_TEMPLATES.find((p) => p.id === personaId)
                if (persona) chat.applyPersona(persona)
              }}
              isGenerating={chat.isGenerating}
              disabled={!isReady}
              modelInfo={selectedModelId ? getModelById(selectedModelId) : null}
              tokenStats={chat.tokenStats}
              isStreaming={chat.isStreaming}
              // v0.26.1: knowledge base context
              knowledgeBaseName={knowledgeBases.activeBaseId
                ? knowledgeBases.getBaseById(knowledgeBases.activeBaseId)?.name ?? null
                : null}
              knowledgeContextCount={chat.knowledgeContextCount}
              // v0.30: agent mode
              agentMode={agentInputMode || agentMode.state.isRunning}
              onToggleAgentMode={() => {
                setAgentInputMode((v) => !v)
              }}
              onAgentSend={
                agentMode.state.isRunning
                  ? undefined
                  : (goal: string) => {
                      agentMode.start(goal)
                      setAgentInputMode(false)
                      setShowAgent(true)
                    }
              }
              // v0.30: model chaining
              chainConfig={chat.chainConfig}
              chainProgress={chat.chainProgress}
              // v1.0.7: SearXNG web search
              searxngUrl={chat.searxngUrl}
              onToggleSearch={chat.isSearching ? undefined : (query: string) => chat.toggleSearch(query)}
              isSearching={chat.isSearching}
              searchResults={chat.searchResults ? Array.from(chat.searchResults) : null}
            />
            {showAgent && agentMode.state.task && (
              <div className="agent-chat-overlay">
                <AgentPanel
                  task={agentMode.state.task}
                  onStop={agentMode.stop}
                  onClose={() => setShowAgent(false)}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
