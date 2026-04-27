/**
 * Lightweight i18n engine — zero dependencies.
 * Supports en / zh / ja locales.
 */

// Global window augmentation for locale tracking
declare global {
  interface Window {
    __i18nLocale?: Locale
  }
}

export type Locale = 'en' | 'zh' | 'ja'

export interface LocaleMeta {
  name: string
  nativeName: string
  dir?: 'ltr' | 'rtl'
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  zh: { name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
}

/** All translation dictionaries */
const translations: Record<Locale, Record<string, string>> = {
  // ── Sidebar ──
  en: {
    'sidebar.brand': 'Monday',
    'sidebar.newChat': 'New Chat',
    'sidebar.noConversations': 'No conversations yet',
    'sidebar.noMatching': 'No matching conversations',
    'sidebar.delete': 'Delete',
    'sidebar.newWindow': 'Open in New Window',
    'sidebar.stats': 'Usage Statistics',
    'sidebar.compare': 'Model Comparison',
    'sidebar.bench': 'Model Benchmark',
    'sidebar.models': 'Custom Model Import',
    'sidebar.personas': 'Persona Marketplace',
    'sidebar.docs': 'Knowledge',
    'sidebar.plugins': 'Plugins',
    'sidebar.mcp': 'MCP Servers',
    'sidebar.webdav': 'WebDAV Sync',
    'sidebar.memory': 'Memory',
    'sidebar.agent': "Agent Mode",
    'sidebar.analytics': 'Usage Analytics',
    'sidebar.hotkeys': 'Keyboard Shortcuts',
    'sidebar.share': 'Share conversation',
    'sidebar.changelog': "What's New",
    'sidebar.exportCurrent': 'Export current conversation',
    'sidebar.exportAll': 'Export all conversations',
    'sidebar.shareHtml': 'Share as HTML',
    'sidebar.exportData': 'Export all data',
    'sidebar.importData': 'Import data',
    'sidebar.storage': 'localStorage usage',
    'sidebar.exportMenu': 'Export conversations',
    'sidebar.github': 'GitHub',
    'sidebar.viewChangelog': 'View changelog',
  },
  zh: {
    'sidebar.brand': 'Monday',
    'sidebar.newChat': '新对话',
    'sidebar.noConversations': '还没有对话',
    'sidebar.noMatching': '没有匹配的对话',
    'sidebar.delete': '删除',
    'sidebar.newWindow': '在新窗口打开',
    'sidebar.stats': '使用统计',
    'sidebar.compare': '模型对比',
    'sidebar.bench': '模型基准',
    'sidebar.models': '自定义模型',
    'sidebar.personas': '人格市场',
    'sidebar.docs': '知识库',
    'sidebar.plugins': '插件',
    'sidebar.mcp': 'MCP 服务器',
    'sidebar.webdav': 'WebDAV 同步',
    'sidebar.memory': '记忆',
    'sidebar.agent': 'Agent 模式',
    'sidebar.analytics': '使用分析',
    'sidebar.hotkeys': '键盘快捷键',
    'sidebar.share': '分享对话',
    'sidebar.changelog': '更新日志',
    'sidebar.exportCurrent': '导出当前对话',
    'sidebar.exportAll': '导出所有对话',
    'sidebar.shareHtml': '以 HTML 分享',
    'sidebar.exportData': '导出全部数据',
    'sidebar.importData': '导入数据',
    'sidebar.storage': 'localStorage 使用量',
    'sidebar.exportMenu': '导出对话',
    'sidebar.github': 'GitHub',
    'sidebar.viewChangelog': '查看更新日志',
  },
  ja: {
    'sidebar.brand': 'Monday',
    'sidebar.newChat': '新しいチャット',
    'sidebar.noConversations': 'まだ会話がありません',
    'sidebar.noMatching': '一致する会話がありません',
    'sidebar.delete': '削除',
    'sidebar.newWindow': '新しいウィンドウで開く',
    'sidebar.stats': '利用統計',
    'sidebar.compare': 'モデル比較',
    'sidebar.bench': 'モデルベンチマーク',
    'sidebar.models': 'カスタムモデル',
    'sidebar.personas': 'ペルソナマーケット',
    'sidebar.docs': 'ナレッジ',
    'sidebar.plugins': 'プラグイン',
    'sidebar.mcp': 'MCPサーバー',
    'sidebar.webdav': 'WebDAV同期',
    'sidebar.memory': 'メモリ',
    'sidebar.agent': 'エージェントモード',
    'sidebar.analytics': '利用分析',
    'sidebar.hotkeys': 'キーボードショートカット',
    'sidebar.share': '会話を共有',
    'sidebar.changelog': '更新履歴',
    'sidebar.exportCurrent': '現在の会話をエクスポート',
    'sidebar.exportAll': 'すべての会話をエクスポート',
    'sidebar.shareHtml': 'HTMLで共有',
    'sidebar.exportData': 'すべてのデータをエクスポート',
    'sidebar.importData': 'データをインポート',
    'sidebar.storage': 'localStorage使用量',
    'sidebar.exportMenu': 'エクスポート',
    'sidebar.github': 'GitHub',
    'sidebar.viewChangelog': '更新履歴を表示',
  },
}

// ── Command Palette ──
const cmd: Record<Locale, Record<string, string>> = {
  en: {
    'cmd.placeholder': 'Type a command or search...',
    'cmd.empty': 'No commands found',
  },
  zh: {
    'cmd.placeholder': '输入命令或搜索…',
    'cmd.empty': '未找到命令',
  },
  ja: {
    'cmd.placeholder': 'コマンドを入力または検索…',
    'cmd.empty': 'コマンドが見つかりません',
  },
}

// ── Chat Input ──
const chat: Record<Locale, Record<string, string>> = {
  en: {
    'chat.placeholderDisabled': 'Select and load a model to start chatting...',
    'chat.placeholderWithImages': 'Add a message or remove images above...',
    'chat.placeholderAgent': 'Describe a task for the agent to accomplish...',
    'chat.placeholderNormal': 'Type a message... (Enter to send, Shift+Enter for new line)',
    'chat.attachFile': 'Attach file',
    'chat.voiceInput': 'Voice input',
    'chat.stopListening': 'Stop listening',
    'chat.quickPersonas': 'Quick personas:',
    'chat.stop': 'Stop',
    'chat.agent': 'Agent',
    'chat.agentOn': 'Agent mode on',
    'chat.agentOff': 'Enable agent mode',
    'chat.batch': 'Batch',
    'chat.batchTitle': 'Generate multiple responses',
    'chat.send': 'Send',
    'chat.hint': 'Running 100% locally in your browser via WebGPU',
    'chat.chainingDrafting': 'Drafting…',
    'chat.chainingRefining': 'Refining…',
    'chat.chainingSwitching': 'Switching models…',
    'chat.chainingLoadingDraft': 'Loading draft model…',
    'chat.chainingDone': 'Done',
    'chat.chainingDefault': 'Model Chaining',
    'chat.tokPerSec': 'tok/s',
    'chat.tokens': 'tokens',
    'chat.knowledgeChunks': 'chunks',
    'chat.slashHint': 'Quick personas:',
  },
  zh: {
    'chat.placeholderDisabled': '选择并加载模型开始对话…',
    'chat.placeholderWithImages': '添加消息或移除上方图片…',
    'chat.placeholderAgent': '描述一个需要 Agent 完成的任务…',
    'chat.placeholderNormal': '输入消息…（Enter 发送，Shift+Enter 换行）',
    'chat.attachFile': '附加文件',
    'chat.voiceInput': '语音输入',
    'chat.stopListening': '停止录音',
    'chat.quickPersonas': '快速人格：',
    'chat.stop': '停止',
    'chat.agent': 'Agent',
    'chat.agentOn': 'Agent 模式已开启',
    'chat.agentOff': '启用 Agent 模式',
    'chat.batch': '批量',
    'chat.batchTitle': '生成多个回复',
    'chat.send': '发送',
    'chat.hint': '通过 WebGPU 在浏览器中 100% 本地运行',
    'chat.chainingDrafting': '草稿生成中…',
    'chat.chainingRefining': '精炼中…',
    'chat.chainingSwitching': '切换模型中…',
    'chat.chainingLoadingDraft': '加载草稿模型中…',
    'chat.chainingDone': '完成',
    'chat.chainingDefault': '模型链式推理',
    'chat.tokPerSec': 'tok/s',
    'chat.tokens': 'tokens',
    'chat.knowledgeChunks': '个片段',
    'chat.slashHint': '快速人格：',
  },
  ja: {
    'chat.placeholderDisabled': 'モデルを選択してチャットを開始…',
    'chat.placeholderWithImages': 'メッセージを追加するか、上の画像を削除…',
    'chat.placeholderAgent': 'エージェントに実行してもらうタスクを説明…',
    'chat.placeholderNormal': 'メッセージを入力…（Enterで送信、Shift+Enterで改行）',
    'chat.attachFile': 'ファイルを添付',
    'chat.voiceInput': '音声入力',
    'chat.stopListening': '録音を停止',
    'chat.quickPersonas': 'クイックペルソナ：',
    'chat.stop': '停止',
    'chat.agent': 'エージェント',
    'chat.agentOn': 'エージェントモードON',
    'chat.agentOff': 'エージェントモードを有効化',
    'chat.batch': '一括',
    'chat.batchTitle': '複数の応答を生成',
    'chat.send': '送信',
    'chat.hint': 'WebGPUでブラウザ内100%ローカル実行',
    'chat.chainingDrafting': 'ドラフト作成中…',
    'chat.chainingRefining': 'リファイン中…',
    'chat.chainingSwitching': 'モデル切替中…',
    'chat.chainingLoadingDraft': 'ドラフトモデル読み込み中…',
    'chat.chainingDone': '完了',
    'chat.chainingDefault': 'モデルチェーン',
    'chat.tokPerSec': 'tok/s',
    'chat.tokens': 'トークン',
    'chat.knowledgeChunks': 'チャンク',
    'chat.slashHint': 'クイックペルソナ：',
  },
}

// ── Usage Analytics ──
const analytics: Record<Locale, Record<string, string>> = {
  en: {
    'analytics.title': 'Usage Analytics',
    'analytics.desc': 'Track token usage, throughput, and session activity',
    'analytics.loading': 'Loading analytics...',
    'analytics.totalTokens': 'Total Tokens',
    'analytics.avgTps': 'Avg TPS',
    'analytics.totalSessions': 'Total Sessions',
    'analytics.sessionsPerDay': 'Sessions/Day',
    'analytics.tokenByModel': 'Token Usage by Model',
    'analytics.dailyTokens': 'Daily Token Usage (Last 7 Days)',
    'analytics.sessionsPerDayChart': 'Sessions per Day (Last 7 Days)',
    'analytics.avgTpsByModel': 'Average TPS by Model',
    'analytics.recentGenerations': 'Recent Generations',
    'analytics.noData': 'Start generating responses to see token usage stats!',
    'analytics.chartEmpty': 'No data yet',
    'analytics.tableModel': 'Model',
    'analytics.tablePrompt': 'Prompt',
    'analytics.tableCompletion': 'Completion',
    'analytics.tableTotal': 'Total',
    'analytics.tableTps': 'TPS',
    'analytics.tableTime': 'Time',
    'analytics.tps': 'tps',
  },
  zh: {
    'analytics.title': '使用分析',
    'analytics.desc': '追踪 token 使用量、吞吐量和会话活动',
    'analytics.loading': '加载分析数据…',
    'analytics.totalTokens': '总 Tokens',
    'analytics.avgTps': '平均 TPS',
    'analytics.totalSessions': '总会话',
    'analytics.sessionsPerDay': '每日会话',
    'analytics.tokenByModel': '模型 Token 使用量',
    'analytics.dailyTokens': '每日 Token 使用量（最近 7 天）',
    'analytics.sessionsPerDayChart': '每日会话数（最近 7 天）',
    'analytics.avgTpsByModel': '各模型平均 TPS',
    'analytics.recentGenerations': '最近生成',
    'analytics.noData': '开始生成回复以查看使用统计！',
    'analytics.chartEmpty': '暂无数据',
    'analytics.tableModel': '模型',
    'analytics.tablePrompt': '提示',
    'analytics.tableCompletion': '完成',
    'analytics.tableTotal': '总计',
    'analytics.tableTps': 'TPS',
    'analytics.tableTime': '时间',
    'analytics.tps': 'tps',
  },
  ja: {
    'analytics.title': '利用分析',
    'analytics.desc': 'トークン使用量、スループット、セッションアクティビティを追跡',
    'analytics.loading': '分析データを読み込み中…',
    'analytics.totalTokens': '総トークン',
    'analytics.avgTps': '平均 TPS',
    'analytics.totalSessions': '総セッション',
    'analytics.sessionsPerDay': '1日あたりセッション',
    'analytics.tokenByModel': 'モデル別トークン使用量',
    'analytics.dailyTokens': '1日あたりトークン使用量（過去7日間）',
    'analytics.sessionsPerDayChart': '1日あたりセッション（過去7日間）',
    'analytics.avgTpsByModel': 'モデル別平均 TPS',
    'analytics.recentGenerations': '最近の生成',
    'analytics.noData': '利用統計を見るには応答を生成してください！',
    'analytics.chartEmpty': 'データなし',
    'analytics.tableModel': 'モデル',
    'analytics.tablePrompt': 'プロンプト',
    'analytics.tableCompletion': '完成',
    'analytics.tableTotal': '合計',
    'analytics.tableTps': 'TPS',
    'analytics.tableTime': '時間',
    'analytics.tps': 'tps',
  },
}

// ── Knowledge Panel ──
const knowledge: Record<Locale, Record<string, string>> = {
  en: {
    'knowledge.activeBase': '📌 Active base:',
    'knowledge.indexedChunks': '📊 Indexed {count} chunks',
    'knowledge.noDocs': 'No documents yet. Upload files to build your knowledge base.',
    'knowledge.loading': 'Parsing documents…',
    'knowledge.error': 'Error',
  },
  zh: {
    'knowledge.activeBase': '📌 活跃知识库：',
    'knowledge.indexedChunks': '📊 已索引 {count} 个片段',
    'knowledge.noDocs': '还没有文档。上传文件来构建知识库。',
    'knowledge.loading': '解析文档中…',
    'knowledge.error': '错误',
  },
  ja: {
    'knowledge.activeBase': '📌 有効なベース:',
    'knowledge.indexedChunks': '📊 {count}チャンクをインデックス済み',
    'knowledge.noDocs': 'まだドキュメントがありません。ファイルをアップロードしてナレッジベースを構築してください。',
    'knowledge.loading': 'ドキュメントを解析中…',
    'knowledge.error': 'エラー',
  },
}

// ── Memory Panel ──
const memory: Record<Locale, Record<string, string>> = {
  en: {
    'memory.title': 'Memory',
    'memory.noSummaries': 'No summaries yet',
  },
  zh: {
    'memory.title': '记忆',
    'memory.noSummaries': '暂无摘要',
  },
  ja: {
    'memory.title': 'メモリ',
    'memory.noSummaries': 'サマリーなし',
  },
}

// ── Settings Panel ──
const settings: Record<Locale, Record<string, string>> = {
  en: {
    'settings.temperature': 'Temperature',
    'settings.creative': 'Creative',
    'settings.precise': 'Precise',
    'settings.topP': 'Top-p',
    'settings.strict': 'Strict',
    'settings.diverse': 'Diverse',
    'settings.maxTokens': 'Max tokens',
    'settings.language': 'Language',
    'settings.langAuto': 'Auto (detect)',
    'settings.langEnglish': 'English',
    'settings.langChinese': '中文',
    'settings.langJapanese': '日本語',
    'settings.systemPrompt': 'System Prompt',
    'settings.systemPromptPlaceholder': 'Enter system prompt (optional)...\n\ne.g. You are a helpful coding assistant. Be concise and precise.',
    'settings.systemPromptHint': 'This prompt will be sent as the system message for each conversation. Leave empty to use the model\'s default behavior.',
    'settings.notifications': 'Notifications',
    'settings.notificationsHint': 'Get a browser notification when a long generation finishes while you\'re away.',
    'settings.allowNotifications': 'Allow notifications',
    'settings.notificationsEnabled': '✓ Notifications enabled',
    'settings.notificationsBlocked': 'Notifications blocked — check browser settings',
  },
  zh: {
    'settings.temperature': '温度',
    'settings.creative': '创意',
    'settings.precise': '精确',
    'settings.topP': 'Top-p',
    'settings.strict': '严格',
    'settings.diverse': '多样',
    'settings.maxTokens': '最大 tokens',
    'settings.language': '语言',
    'settings.langAuto': '自动（检测）',
    'settings.langEnglish': 'English',
    'settings.langChinese': '中文',
    'settings.langJapanese': '日本語',
    'settings.systemPrompt': '系统提示',
    'settings.systemPromptPlaceholder': '输入系统提示（可选）...\n\n例如：你是一个有帮助的编程助手。简洁精确。',
    'settings.systemPromptHint': '此提示将作为每条对话的系统消息发送。留空则使用模型的默认行为。',
    'settings.notifications': '通知',
    'settings.notificationsHint': '当长时间生成完成时，你会收到浏览器通知。',
    'settings.allowNotifications': '允许通知',
    'settings.notificationsEnabled': '✓ 通知已启用',
    'settings.notificationsBlocked': '通知被阻止 — 请检查浏览器设置',
  },
  ja: {
    'settings.temperature': '温度',
    'settings.creative': 'クリエイティブ',
    'settings.precise': '精密',
    'settings.topP': 'Top-p',
    'settings.strict': '厳格',
    'settings.diverse': '多様',
    'settings.maxTokens': '最大トークン',
    'settings.language': '言語',
    'settings.langAuto': '自動（検出）',
    'settings.langEnglish': 'English',
    'settings.langChinese': '中文',
    'settings.langJapanese': '日本語',
    'settings.systemPrompt': 'システムプロンプト',
    'settings.systemPromptPlaceholder': 'システムプロンプトを入力（任意）...\n\n例：あなたは役に立つプログラミングアシスタントです。簡潔に正確に。',
    'settings.systemPromptHint': 'このプロンプトは各会話のシステムメッセージとして送信されます。空白にするとモデルのデフォルト動作が使用されます。',
    'settings.notifications': '通知',
    'settings.notificationsHint': '長時間の生成が完了したときにブラウザ通知を受け取ります。',
    'settings.allowNotifications': '通知を許可',
    'settings.notificationsEnabled': '✓ 通知が有効',
    'settings.notificationsBlocked': '通知がブロックされました — ブラウザ設定を確認してください',
  },
}

// ── Message List ──
const msgList: Record<Locale, Record<string, string>> = {
  en: {
    'msg.noModel': 'No model loaded',
    'msg.noModelHint': 'Download a model to start chatting — everything runs locally in your browser.',
    'msg.loadingModel': 'Loading model…',
    'msg.loadingModelHint': 'The model is being prepared. Chat will be available shortly.',
    'msg.startConversation': 'Start a conversation',
    'msg.startHint': 'Your messages are processed locally in your browser. Nothing is sent to any server.',
  },
  zh: {
    'msg.noModel': '未加载模型',
    'msg.noModelHint': '下载模型开始对话 — 一切在浏览器本地运行。',
    'msg.loadingModel': '加载模型中…',
    'msg.loadingModelHint': '模型正在准备中，聊天即将可用。',
    'msg.startConversation': '开始对话',
    'msg.startHint': '你的消息在浏览器本地处理，不会发送到任何服务器。',
  },
  ja: {
    'msg.noModel': 'モデルが読み込まれていません',
    'msg.noModelHint': 'モデルをダウンロードしてチャットを開始 — すべてブラウザ内でローカル実行されます。',
    'msg.loadingModel': 'モデルを読み込み中…',
    'msg.loadingModelHint': 'モデルの準備中です。まもなくチャットが利用可能になります。',
    'msg.startConversation': '会話を開始',
    'msg.startHint': 'メッセージはブラウザ内でローカル処理されます。サーバーには送信されません。',
  },
}

// ── Cache Manager ──
const cache: Record<Locale, Record<string, string>> = {
  en: {
    'cache.loading': 'Loading cache info...',
    'cache.noModels': 'No cached models found.',
  },
  zh: {
    'cache.loading': '加载缓存信息…',
    'cache.noModels': '未找到缓存模型。',
  },
  ja: {
    'cache.loading': 'キャッシュ情報を読み込み中…',
    'cache.noModels': 'キャッシュされたモデルが見つかりません。',
  },
}

// ── Update Banner ──
const banner: Record<Locale, Record<string, string>> = {
  en: {
    'banner.title': "Monday updated!",
    'banner.desc': 'A new version is ready. Reload to get the latest.',
  },
  zh: {
    'banner.title': 'Monday 已更新！',
    'banner.desc': '新版本已就绪。刷新以获取最新版本。',
  },
  ja: {
    'banner.title': 'Mondayが更新されました！',
    'banner.desc': '新しいバージョンが準備できました。リロードして最新バージョンを取得してください。',
  },
}

// ── WebDAV ──
const webdav: Record<Locale, Record<string, string>> = {
  en: {
    'webdav.offline': 'WebDAV sync requires an internet connection.',
    'webdav.connected': 'Connected',
    'webdav.corsNotice': 'You may need a CORS proxy (e.g., "CORS Unblock") to allow cross-origin requests.',
  },
  zh: {
    'webdav.offline': 'WebDAV 同步需要网络连接。',
    'webdav.connected': '已连接',
    'webdav.corsNotice': '你可能需要 CORS 代理（如 "CORS Unblock"）来允许跨域请求。',
  },
  ja: {
    'webdav.offline': 'WebDAV同期にはインターネット接続が必要です。',
    'webdav.connected': '接続済み',
    'webdav.corsNotice': 'クロスオリジンリクエストを許可するためにCORSプロキシ（例：「CORS Unblock」）が必要になる場合があります。',
  },
}

// ── MCP ──
const mcp: Record<Locale, Record<string, string>> = {
  en: {
    'mcp.offline': 'MCP server connections require an internet connection.',
    'mcp.urlHint': 'Enter the WebSocket URL of an MCP server (e.g., <code>ws://localhost:3001/mcp</code>).',
  },
  zh: {
    'mcp.offline': 'MCP 服务器连接需要网络连接。',
    'mcp.urlHint': '输入 MCP 服务器的 WebSocket URL（例如 <code>ws://localhost:3001/mcp</code>）。',
  },
  ja: {
    'mcp.offline': 'MCPサーバー接続にはインターネット接続が必要です。',
    'mcp.urlHint': 'MCPサーバーのWebSocket URLを入力してください（例：<code>ws://localhost:3001/mcp</code>）。',
  },
}

// ── Plugin Manager ──
const plugin: Record<Locale, Record<string, string>> = {
  en: {
    'plugin.offline': 'Plugin installation requires an internet connection.',
    'plugin.manifestHint': 'The manifest must be valid JSON with <code>id</code>, <code>name</code>, <code>description</code>, <code>version</code>, <code>inputSchema</code>, and <code>handlerUrl</code> fields.',
  },
  zh: {
    'plugin.offline': '插件安装需要网络连接。',
    'plugin.manifestHint': '清单必须是有效的 JSON，包含 <code>id</code>、<code>name</code>、<code>description</code>、<code>version</code>、<code>inputSchema</code> 和 <code>handlerUrl</code> 字段。',
  },
  ja: {
    'plugin.offline': 'プラグインのインストールにはインターネット接続が必要です。',
    'plugin.manifestHint': 'マニフェストは<code>id</code>、<code>name</code>、<code>description</code>、<code>version</code>、<code>inputSchema</code>、<code>handlerUrl</code>フィールドを含む有効なJSONである必要があります。',
  },
}

// ── Persona Marketplace ──
const persona: Record<Locale, Record<string, string>> = {
  en: {
    'persona.noResults': 'No personas found',
    'persona.noResultsWithQuery': 'for "{query}"',
    'persona.noResultsCategory': 'in this category',
  },
  zh: {
    'persona.noResults': '未找到人格',
    'persona.noResultsWithQuery': '搜索 "{query}"',
    'persona.noResultsCategory': '此分类中',
  },
  ja: {
    'persona.noResults': 'ペルソナが見つかりません',
    'persona.noResultsWithQuery': '"{query}"',
    'persona.noResultsCategory': 'このカテゴリ',
  },
}

// ── Persona Publish ──
const publish: Record<Locale, Record<string, string>> = {
  en: {
    'publish.jsonHint': 'file. Add your entry to the <code>PERSONA_REGISTRY</code> array.',
  },
  zh: {
    'publish.jsonHint': '文件。将你的条目添加到 <code>PERSONA_REGISTRY</code> 数组中。',
  },
  ja: {
    'publish.jsonHint': 'ファイル。<code>PERSONA_REGISTRY</code>配列にエントリを追加してください。',
  },
}

// ── Custom Model Import ──
const customModel: Record<Locale, Record<string, string>> = {
  en: {
    'customModel.example': 'Example: onnx-community/Qwen2.5-0.5B-Instruct',
    'customModel.tipsTitle': 'Tips',
    'customModel.tip1': 'Model must be MLC-compiled (look for <code>-MLC</code> suffix in the model ID)',
    'customModel.tip2': 'Models are downloaded from HuggingFace and cached in your browser',
    'customModel.tip3': 'Larger models require more VRAM — check your device specs first',
    'customModel.tip4': 'Use <code>onnx-community/</code> prefix for WebGPU-compatible models',
  },
  zh: {
    'customModel.example': '示例：onnx-community/Qwen2.5-0.5B-Instruct',
    'customModel.tipsTitle': '提示',
    'customModel.tip1': '模型必须是 MLC 编译的（在模型 ID 中查找 <code>-MLC</code> 后缀）',
    'customModel.tip2': '模型从 HuggingFace 下载并缓存在浏览器中',
    'customModel.tip3': '更大的模型需要更多显存 — 请先检查你的设备规格',
    'customModel.tip4': '使用 <code>onnx-community/</code> 前缀获取 WebGPU 兼容模型',
  },
  ja: {
    'customModel.example': '例: onnx-community/Qwen2.5-0.5B-Instruct',
    'customModel.tipsTitle': 'ヒント',
    'customModel.tip1': 'モデルはMLCコンパイル済みである必要があります（モデルIDに<code>-MLC</code>接尾辞があるか確認）',
    'customModel.tip2': 'モデルはHuggingFaceからダウンロードされ、ブラウザにキャッシュされます',
    'customModel.tip3': '大きなモデルはより多くのVRAMが必要です — まずデバイスの仕様を確認してください',
    'customModel.tip4': 'WebGPU対応モデルには<code>onnx-community/</code>プレフィックスを使用',
  },
}

// ── WebGPU Check ──
const webgpu: Record<Locale, Record<string, string>> = {
  en: {
    'webgpu.title': 'WebGPU not supported',
  },
  zh: {
    'webgpu.title': '不支持 WebGPU',
  },
  ja: {
    'webgpu.title': 'WebGPUがサポートされていません',
  },
}

// ── Quick Prompts / Persona Editor ──
const quickPrompts: Record<Locale, Record<string, string>> = {
  en: {
    'qp.icon': 'Icon',
    'qp.name': 'Name',
    'qp.description': 'Description',
    'qp.systemPrompt': 'System Prompt',
    'qp.draftModel': 'Fast Draft Model',
    'qp.refineModel': 'Quality Refine Model',
    'qp.none': 'None',
  },
  zh: {
    'qp.icon': '图标',
    'qp.name': '名称',
    'qp.description': '描述',
    'qp.systemPrompt': '系统提示',
    'qp.draftModel': '快速草稿模型',
    'qp.refineModel': '质量精炼模型',
    'qp.none': '无',
  },
  ja: {
    'qp.icon': 'アイコン',
    'qp.name': '名前',
    'qp.description': '説明',
    'qp.systemPrompt': 'システムプロンプト',
    'qp.draftModel': '高速ドラフトモデル',
    'qp.refineModel': '高品質リファインモデル',
    'qp.none': 'なし',
  },
}

// ── Model Selector ──
const modelSelector: Record<Locale, Record<string, string>> = {
  en: {
    'model.params': 'params',
  },
  zh: {
    'model.params': '参数',
  },
  ja: {
    'model.params': 'パラメータ',
  },
}

// ── Benchmark ──
const benchmark: Record<Locale, Record<string, string>> = {
  en: {
    'bench.chooseModel': 'Choose a model...',
    'bench.generatedResponse': 'Generated Response',
  },
  zh: {
    'bench.chooseModel': '选择模型…',
    'bench.generatedResponse': '生成的回复',
  },
  ja: {
    'bench.chooseModel': 'モデルを選択…',
    'bench.generatedResponse': '生成された応答',
  },
}

// ── Keyboard Shortcuts Overlay ──
const shortcuts: Record<Locale, Record<string, string>> = {
  en: {
    'shortcut.commandPalette': 'Command Palette',
    'shortcut.newChat': 'New Chat',
    'shortcut.stopGeneration': 'Stop Generation',
    'shortcut.models': 'Models',
    'shortcut.modelCache': 'Model Cache',
    'shortcut.usageStatistics': 'Usage Statistics',
    'shortcut.personaMarketplace': 'Persona Marketplace',
    'shortcut.knowledge': 'Knowledge',
    'shortcut.modelComparison': 'Model Comparison',
    'shortcut.modelBenchmark': 'Model Benchmark',
    'shortcut.customModelImport': 'Custom Model Import',
    'shortcut.plugins': 'Plugins',
    'shortcut.mcpServers': 'MCP Servers',
    'shortcut.exportAllData': 'Export All Data',
    'shortcut.importData': 'Import Data',
    'shortcut.hotkeys': 'Keyboard Shortcuts',
    'shortcut.agentMode': 'Agent Mode',
    'shortcut.usageAnalytics': 'Usage Analytics',
    'shortcut.memory': 'Memory',
    'shortcut.publishPersona': 'Publish Persona',
    'shortcut.shareConversation': 'Share Conversation',
    'shortcut.resetRecommendations': 'Reset Recommendations',
    'shortcut.resetRecentModels': 'Reset Recent Models',
    'shortcut.settings': 'Settings',
  },
  zh: {
    'shortcut.commandPalette': '命令面板',
    'shortcut.newChat': '新对话',
    'shortcut.stopGeneration': '停止生成',
    'shortcut.models': '模型',
    'shortcut.modelCache': '模型缓存',
    'shortcut.usageStatistics': '使用统计',
    'shortcut.personaMarketplace': '人格市场',
    'shortcut.knowledge': '知识库',
    'shortcut.modelComparison': '模型对比',
    'shortcut.modelBenchmark': '模型基准',
    'shortcut.customModelImport': '自定义模型',
    'shortcut.plugins': '插件',
    'shortcut.mcpServers': 'MCP 服务器',
    'shortcut.exportAllData': '导出全部数据',
    'shortcut.importData': '导入数据',
    'shortcut.hotkeys': '键盘快捷键',
    'shortcut.agentMode': 'Agent 模式',
    'shortcut.usageAnalytics': '使用分析',
    'shortcut.memory': '记忆',
    'shortcut.publishPersona': '发布人格',
    'shortcut.shareConversation': '分享对话',
    'shortcut.resetRecommendations': '重置推荐',
    'shortcut.resetRecentModels': '重置最近模型',
    'shortcut.settings': '设置',
  },
  ja: {
    'shortcut.commandPalette': 'コマンドパレット',
    'shortcut.newChat': '新しいチャット',
    'shortcut.stopGeneration': '生成を停止',
    'shortcut.models': 'モデル',
    'shortcut.modelCache': 'モデルキャッシュ',
    'shortcut.usageStatistics': '利用統計',
    'shortcut.personaMarketplace': 'ペルソナマーケット',
    'shortcut.knowledge': 'ナレッジ',
    'shortcut.modelComparison': 'モデル比較',
    'shortcut.modelBenchmark': 'モデルベンチマーク',
    'shortcut.customModelImport': 'カスタムモデル',
    'shortcut.plugins': 'プラグイン',
    'shortcut.mcpServers': 'MCPサーバー',
    'shortcut.exportAllData': 'すべてのデータをエクスポート',
    'shortcut.importData': 'データをインポート',
    'shortcut.hotkeys': 'キーボードショートカット',
    'shortcut.agentMode': 'エージェントモード',
    'shortcut.usageAnalytics': '利用分析',
    'shortcut.memory': 'メモリ',
    'shortcut.publishPersona': 'ペルソナ公開',
    'shortcut.shareConversation': '会話を共有',
    'shortcut.resetRecommendations': '推奨をリセット',
    'shortcut.resetRecentModels': '最近のモデルをリセット',
    'shortcut.settings': '設定',
  },
}

// ── Merge all into one dictionary ──
const all: Record<Locale, Record<string, string>> = { en: {}, zh: {}, ja: {} }
for (const locale of ['en', 'zh', 'ja'] as Locale[]) {
  all[locale] = {
    ...translations[locale],
    ...cmd[locale],
    ...chat[locale],
    ...analytics[locale],
    ...knowledge[locale],
    ...memory[locale],
    ...settings[locale],
    ...msgList[locale],
    ...cache[locale],
    ...banner[locale],
    ...webdav[locale],
    ...mcp[locale],
    ...plugin[locale],
    ...persona[locale],
    ...publish[locale],
    ...customModel[locale],
    ...webgpu[locale],
    ...quickPrompts[locale],
    ...modelSelector[locale],
    ...benchmark[locale],
    ...shortcuts[locale],
  }
}

/** Current locale (defaults to 'en') */
let currentLocale: Locale = 'en'

/** Get the current locale */
export function getLocale(): Locale {
  return currentLocale
}

/** Set the current locale */
export function setLocale(locale: Locale): void {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    window.__i18nLocale = locale
  }
}

/** Translate a key — falls back to English */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = all[currentLocale]
  let value = dict[key] ?? all['en'][key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return value
}

/** Get translation dictionary for a locale */
export function getDict(locale: Locale): Record<string, string> {
  return all[locale]
}

/** Check if a locale is available */
export function isLocaleAvailable(locale: string): locale is Locale {
  return locale in all
}

/** Detect locale from navigator */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language?.toLowerCase() ?? ''
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('ja')) return 'ja'
  return 'en'
}
