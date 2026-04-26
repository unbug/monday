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
import { ModelStats } from './components/ModelStats'
import { ModelComparison } from './components/ModelComparison'
import { ModelBenchmark } from './components/ModelBenchmark'
import { CustomModelImport } from './components/CustomModelImport'
import { PersonaMarketplace } from './components/PersonaMarketplace'
import { KnowledgePanel } from './components/KnowledgePanel'
import { ToolCallInspector } from './components/ToolCallInspector'
import { PluginManager } from './components/PluginManager'
import { McpServerManager } from './components/McpServerManager'
import { WebDAVSettings } from './components/WebDAVSettings'
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
import { PWAInstallBanner } from './components/PWAInstallBanner'
import type { ModelInfo, CitationEntry } from './types'
import type { ImportResult } from './lib/dataImport'
import { PROMPT_TEMPLATES } from './lib/prompts'
import { getModelById } from './lib/models'
import { shareSession } from './lib/shareExport'
import { exportMondayData } from './lib/dataExport'
import { importMondayData } from './lib/dataImport'
import { resetModelUsage } from './lib/modelUsage'
import { resetRecentModels as resetRecent } from './lib/recentModels'
import './App.css'

type View = 'chat' | 'models' | 'changelog' | 'cache' | 'stats' | 'comparison' | 'benchmark' | 'custom-models' | 'persona-marketplace' | 'knowledge' | 'plugins' | 'mcp-servers' | 'webdav'

export default function App() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [view, setView] = useState<View>('models')
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

  const model = useModel()
  const chat = useChat(selectedModelId ?? '')
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

  useEffect(() => {
    chat.initSessions()
  }, [chat.initSessions])

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

  const handleSend = useCallback(
    (content: string, images?: Array<{ id: string; data: string; name?: string }>, files?: Array<{ id: string; name: string; size: number; type: string; content: string }>) => {
      chat.sendMessage(content, undefined, images, files, knowledgeBases.activeBaseId ?? undefined)
    },
    [chat, knowledgeBases.activeBaseId],
  )

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
    onOpenStats: () => setView('stats'),
    onOpenComparison: () => setView('comparison'),
    onOpenBenchmark: () => setView('benchmark'),
    onOpenCustomModels: () => setView('custom-models'),
    onResetRecommendations: () => handleResetRecommendations(),
    onResetRecentModels: () => resetRecent(),
    onOpenPersonaMarketplace: () => setView('persona-marketplace'),
    onOpenKnowledge: () => setView('knowledge'),
    onOpenMcpServers: () => setView('mcp-servers'),
    onOpenWebDAV: () => setView('webdav'),
    onPublishPersona: () => setView('persona-marketplace'),
    onShare: handleShare,
    onExportData: handleExportData,
    onImportData: handleImportData,
  })

  const isReady = model.status === 'ready'
  const { canInstall, promptInstall, onDismiss } = useInstallPrompt()

  const modelBadgeText = selectedModelId
    ? selectedModelId.split('-').slice(0, 2).join(' ')
    : ''

  const closeSidebarOnMobile = useCallback(() => {
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }, [])

  return (
    <div className="app">
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
            onOpenStats={() => {
              setView('stats')
              closeSidebarOnMobile()
            }}
            onOpenComparison={() => {
              setView('comparison')
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
            activePersonaId={activePersonaId ?? null}
            onApplyPersona={chat.applyPersona}
            onClearPersona={chat.clearPersona}
            onImport={handleImportData}
            onExport={handleExportData}
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

      <main className="main">
        <header className="header">
          <button
            className="header-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
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
        ) : view === 'stats' ? (
          <div className="main-content main-content--stats">
            <ModelStats onResetRecommendations={handleResetRecommendations}
              />
          </div>
        ) : view === 'comparison' ? (
          <div className="main-content main-content--comparison">
            <ModelComparison onBack={() => setView('models')} />
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
            <PluginManager onBack={() => setView('chat')} />
          </div>
        ) : view === 'mcp-servers' ? (
          <div className="main-content main-content--mcp-servers">
            <McpServerManager onBack={() => setView('chat')} />
          </div>
        ) : view === 'webdav' ? (
          <div className="main-content main-content--webdav">
            <WebDAVSettings
              onBack={() => setView('chat')}
              onSyncComplete={(success, message) => setWebdavToast({ success, message })}
            />
          </div>
        ) : (
          <div className="chat-layout">
            <div className="chat-messages">
              <MessageList
                messages={chat.messages}
                isStreaming={chat.isGenerating}
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
              <ToolCallInspector
                events={chat.toolCallEvents ?? []}
                isProcessing={chat.isGenerating}
                onCollapse={() => {}}
              />
            </div>
            <ChatInput
              onSend={handleSend}
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
            />
          </div>
        )}
      </main>
    </div>
  )
}
