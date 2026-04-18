import { useState, useEffect, useCallback } from 'react'
import { BorderBeam } from 'border-beam'
import { Sidebar } from './components/Sidebar'
import { ModelSelector } from './components/ModelSelector'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'
import { WebGPUCheck } from './components/WebGPUCheck'
import { useModel } from './hooks/useModel'
import { useChat } from './hooks/useChat'
import type { ModelInfo } from './types'
import './App.css'

type View = 'chat' | 'models'

export default function App() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [view, setView] = useState<View>('models')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const model = useModel()
  const chat = useChat(selectedModelId ?? '')

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

  const handleSend = useCallback(
    (content: string) => {
      chat.sendMessage(content)
    },
    [chat],
  )

  const handleNewChat = useCallback(() => {
    chat.newSession()
    setView('chat')
  }, [chat])

  const isReady = model.status === 'ready'

  const modelBadgeText = selectedModelId
    ? selectedModelId.split('-').slice(0, 2).join(' ')
    : ''

  return (
    <div className="app">
      {sidebarOpen && (
        <Sidebar
          sessions={chat.sessions}
          activeSessionId={chat.activeSession?.id ?? null}
          onSelect={(id) => {
            chat.switchSession(id)
            setView('chat')
          }}
          onNew={handleNewChat}
          onDelete={chat.deleteSession}
        />
      )}

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
              <BorderBeam size="sm" colorVariant="ocean" strength={0.5} duration={3}>
                <span className="header-model-badge">
                  <span className="header-model-dot" />
                  {modelBadgeText}
                </span>
              </BorderBeam>
            )}
            {model.status === 'downloading' && (
              <BorderBeam size="sm" colorVariant="colorful" strength={0.6} duration={1.5} active>
                <span className="header-loading">
                  Loading model... {model.progress}%
                </span>
              </BorderBeam>
            )}
          </div>

          <button
            className="header-models-btn"
            onClick={() => setView(view === 'models' ? 'chat' : 'models')}
          >
            {view === 'models' ? 'Chat' : 'Models'}
          </button>
        </header>

        <WebGPUCheck supported={model.webgpuSupported} />

        {view === 'models' ? (
          <div className="main-content">
            <ModelSelector
              currentModelId={selectedModelId}
              modelState={{
                status: model.status,
                progress: model.progress,
                error: model.error,
              }}
              onSelect={handleSelectModel}
            />
          </div>
        ) : (
          <div className="chat-layout">
            <div className="chat-messages">
              <MessageList messages={chat.messages} />
            </div>
            <ChatInput
              onSend={handleSend}
              onStop={chat.stopGenerating}
              isGenerating={chat.isGenerating}
              disabled={!isReady}
            />
          </div>
        )}
      </main>
    </div>
  )
}
