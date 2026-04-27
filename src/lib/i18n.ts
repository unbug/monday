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

// ── Model Selector ──
const modelSelectorPanel: Record<Locale, Record<string, string>> = {
  en: {
    'modelSelector.title': 'Select a Model',
    'modelSelector.desc': 'All models run directly in your browser using WebGPU. No server needed.',
    'modelSelector.cache': 'Cache',
    'modelSelector.sortPopular': 'Popular',
    'modelSelector.sortLatest': 'Latest',
    'modelSelector.sortSize': 'Size',
    'modelSelector.recent': 'Recently used',
    'modelSelector.resetRecent': 'Reset recent models',
    'modelSelector.recommended': 'Recommended',
    'modelSelector.downloaded': '✓ Downloaded',
    'modelSelector.ready': '● Ready',
    'modelSelector.benchmark': 'Model Benchmark',
    'modelSelector.customModels': 'Custom Model Import',
    'modelSelector.personaMarketplace': 'Persona Marketplace',
    'modelSelector.params': 'params',
  },
  zh: {
    'modelSelector.title': '选择模型',
    'modelSelector.desc': '所有模型直接在浏览器中使用 WebGPU 运行，无需服务器。',
    'modelSelector.cache': '缓存',
    'modelSelector.sortPopular': '热门',
    'modelSelector.sortLatest': '最新',
    'modelSelector.sortSize': '大小',
    'modelSelector.recent': '最近使用',
    'modelSelector.resetRecent': '重置最近模型',
    'modelSelector.recommended': '推荐',
    'modelSelector.downloaded': '✓ 已下载',
    'modelSelector.ready': '● 就绪',
    'modelSelector.benchmark': '模型基准',
    'modelSelector.customModels': '自定义模型',
    'modelSelector.personaMarketplace': '人格市场',
    'modelSelector.params': '参数',
  },
  ja: {
    'modelSelector.title': 'モデルを選択',
    'modelSelector.desc': 'すべてのモデルはWebGPUでブラウザ内で直接実行されます。サーバーは不要です。',
    'modelSelector.cache': 'キャッシュ',
    'modelSelector.sortPopular': '人気',
    'modelSelector.sortLatest': '最新',
    'modelSelector.sortSize': 'サイズ',
    'modelSelector.recent': '最近の使用',
    'modelSelector.resetRecent': '最近のモデルをリセット',
    'modelSelector.recommended': '推奨',
    'modelSelector.downloaded': '✓ ダウンロード済み',
    'modelSelector.ready': '● 準備完了',
    'modelSelector.benchmark': 'モデルベンチマーク',
    'modelSelector.customModels': 'カスタムモデル',
    'modelSelector.personaMarketplace': 'ペルソナマーケット',
    'modelSelector.params': 'パラメータ',
  },
}

// ── Usage Analytics ──
const analyticsPanel: Record<Locale, Record<string, string>> = {
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

// ── Agent Panel ──
const agentPanel: Record<Locale, Record<string, string>> = {
  en: {
    'agent.title': 'Agent Mode',
    'agent.running': 'Running',
    'agent.complete': 'Complete',
    'agent.cancelled': 'Cancelled',
    'agent.error': 'Error',
    'agent.idle': 'Idle',
    'agent.goal': 'Goal',
    'agent.steps': 'steps',
    'agent.stop': 'Stop',
    'agent.taskComplete': '✓ Task complete',
    'agent.waiting': 'Waiting to start…',
    'agent.thought': 'Thought',
    'agent.tool': 'Tool',
    'agent.result': 'Result',
    'agent.errorLabel': 'Error',
    'agent.finalAnswer': 'Final Answer',
    'agent.closePanel': 'Close panel',
    'agent.noArgs': '(no arguments)',
  },
  zh: {
    'agent.title': 'Agent 模式',
    'agent.running': '运行中',
    'agent.complete': '已完成',
    'agent.cancelled': '已取消',
    'agent.error': '错误',
    'agent.idle': '空闲',
    'agent.goal': '目标',
    'agent.steps': '步骤',
    'agent.stop': '停止',
    'agent.taskComplete': '✓ 任务完成',
    'agent.waiting': '等待启动…',
    'agent.thought': '思考',
    'agent.tool': '工具',
    'agent.result': '结果',
    'agent.errorLabel': '错误',
    'agent.finalAnswer': '最终答案',
    'agent.closePanel': '关闭面板',
    'agent.noArgs': '（无参数）',
  },
  ja: {
    'agent.title': 'エージェントモード',
    'agent.running': '実行中',
    'agent.complete': '完了',
    'agent.cancelled': 'キャンセル',
    'agent.error': 'エラー',
    'agent.idle': '待機中',
    'agent.goal': '目標',
    'agent.steps': 'ステップ',
    'agent.stop': '停止',
    'agent.taskComplete': '✓ タスク完了',
    'agent.waiting': '開始待機中…',
    'agent.thought': '思考',
    'agent.tool': 'ツール',
    'agent.result': '結果',
    'agent.errorLabel': 'エラー',
    'agent.finalAnswer': '最終回答',
    'agent.closePanel': 'パネルを閉じる',
    'agent.noArgs': '（引数なし）',
  },
}

// ── Batch Generation ──
const batchGen: Record<Locale, Record<string, string>> = {
  en: {
    'batch.title': 'Batch Generation',
    'batch.back': 'Back to chat',
    'batch.responses': 'Responses:',
    'batch.generate': 'Generate',
    'batch.generateAgain': 'Generate Again',
    'batch.stop': 'Stop',
    'batch.prompt': 'Prompt:',
    'batch.discardAll': 'Discard All',
    'batch.errors': 'Some responses had errors. Pick a successful one or discard all.',
    'batch.generating': 'Generating…',
    'batch.expand': 'Expand',
    'batch.collapse': 'Collapse',
    'batch.pick': 'Pick',
    'batch.currentModel': 'Current Model',
    'batch.tok': 'tok',
  },
  zh: {
    'batch.title': '批量生成',
    'batch.back': '返回聊天',
    'batch.responses': '回复数：',
    'batch.generate': '生成',
    'batch.generateAgain': '再次生成',
    'batch.stop': '停止',
    'batch.prompt': '提示词：',
    'batch.discardAll': '全部丢弃',
    'batch.errors': '部分回复出现错误。选择一个成功的或全部丢弃。',
    'batch.generating': '生成中…',
    'batch.expand': '展开',
    'batch.collapse': '收起',
    'batch.pick': '选择',
    'batch.currentModel': '当前模型',
    'batch.tok': 'tokens',
  },
  ja: {
    'batch.title': '一括生成',
    'batch.back': 'チャットに戻る',
    'batch.responses': '応答数：',
    'batch.generate': '生成',
    'batch.generateAgain': '再帰成',
    'batch.stop': '停止',
    'batch.prompt': 'プロンプト：',
    'batch.discardAll': 'すべて破棄',
    'batch.errors': '一部に応答エラーがあります。成功したものを選ぶか、すべて破棄してください。',
    'batch.generating': '生成中…',
    'batch.expand': '展開',
    'batch.collapse': '折りたたみ',
    'batch.pick': '選択',
    'batch.currentModel': '現在のモデル',
    'batch.tok': 'トークン',
  },
}

// ── Changelog ──
const changelog: Record<Locale, Record<string, string>> = {
  en: {
    'changelog.title': "What's New",
    'changelog.viewOnGitHub': 'View on GitHub',
    'changelog.released': 'Released',
  },
  zh: {
    'changelog.title': '更新日志',
    'changelog.viewOnGitHub': '在 GitHub 上查看',
    'changelog.released': '发布日期',
  },
  ja: {
    'changelog.title': '更新履歴',
    'changelog.viewOnGitHub': 'GitHubで表示',
    'changelog.released': 'リリース日',
  },
}

// ── Offline Indicator ──
const offlineIndicator: Record<Locale, Record<string, string>> = {
  en: {
    'offline.text': 'You are offline — WebDAV, MCP and plugins are disabled',
    'offline.dismiss': 'Dismiss',
  },
  zh: {
    'offline.text': '你已离线 — WebDAV、MCP 和插件已禁用',
    'offline.dismiss': '关闭',
  },
  ja: {
    'offline.text': 'オフラインです — WebDAV、MCP、プラグインが無効化されています',
    'offline.dismiss': '閉じる',
  },
}

// ── Plugin Manager ──
const pluginManager: Record<Locale, Record<string, string>> = {
  en: {
    'pluginManager.title': 'Plugins',
    'pluginManager.install': 'Install Plugin',
    'pluginManager.installed': 'Installed Plugins',
    'pluginManager.noPlugins': 'No plugins installed yet.',
    'pluginManager.installHint': 'Install a third-party plugin by pasting its manifest URL above.',
    'pluginManager.installing': 'Installing…',
    'pluginManager.loaded': '✓ Loaded',
    'pluginManager.error': '✗ Error',
    'pluginManager.remove': 'Remove',
    'pluginManager.failed': 'Failed to install plugin',
  },
  zh: {
    'pluginManager.title': '插件',
    'pluginManager.install': '安装插件',
    'pluginManager.installed': '已安装的插件',
    'pluginManager.noPlugins': '还没有安装插件。',
    'pluginManager.installHint': '在上方粘贴插件清单 URL 来安装第三方插件。',
    'pluginManager.installing': '安装中…',
    'pluginManager.loaded': '✓ 已加载',
    'pluginManager.error': '✗ 错误',
    'pluginManager.remove': '移除',
    'pluginManager.failed': '安装插件失败',
  },
  ja: {
    'pluginManager.title': 'プラグイン',
    'pluginManager.install': 'プラグインをインストール',
    'pluginManager.installed': 'インストール済みプラグイン',
    'pluginManager.noPlugins': 'プラグインがインストールされていません。',
    'pluginManager.installHint': '上記のマニフェストURLを貼り付けてサードパーティプラグインをインストールしてください。',
    'pluginManager.installing': 'インストール中…',
    'pluginManager.loaded': '✓ 読み込み済み',
    'pluginManager.error': '✗ エラー',
    'pluginManager.remove': '削除',
    'pluginManager.failed': 'プラグインのインストールに失敗しました',
  },
}

// ── MCP Server Manager ──
const mcpManager: Record<Locale, Record<string, string>> = {
  en: {
    'mcpManager.title': 'MCP Servers',
    'mcpManager.add': 'Add MCP Server',
    'mcpManager.connected': 'Connected',
    'mcpManager.noServers': 'No MCP servers connected.',
    'mcpManager.addHint': 'Add a server by entering its WebSocket URL above.',
    'mcpManager.connecting': 'Connecting…',
    'mcpManager.addServer': 'Add Server',
    'mcpManager.disconnected': 'Disconnected',
    'mcpManager.reconnect': 'Reconnect',
    'mcpManager.remove': 'Remove',
    'mcpManager.toolsAvailable': 'tool{count} available',
  },
  zh: {
    'mcpManager.title': 'MCP 服务器',
    'mcpManager.add': '添加 MCP 服务器',
    'mcpManager.connected': '已连接',
    'mcpManager.noServers': '没有连接的 MCP 服务器。',
    'mcpManager.addHint': '在上方输入 WebSocket URL 来添加服务器。',
    'mcpManager.connecting': '连接中…',
    'mcpManager.addServer': '添加服务器',
    'mcpManager.disconnected': '已断开',
    'mcpManager.reconnect': '重连',
    'mcpManager.remove': '移除',
    'mcpManager.toolsAvailable': '个可用工具',
  },
  ja: {
    'mcpManager.title': 'MCPサーバー',
    'mcpManager.add': 'MCPサーバーを追加',
    'mcpManager.connected': '接続済み',
    'mcpManager.noServers': 'MCPサーバーが接続されていません。',
    'mcpManager.addHint': '上記のWebSocket URLを入力してサーバーを追加してください。',
    'mcpManager.connecting': '接続中…',
    'mcpManager.addServer': 'サーバーを追加',
    'mcpManager.disconnected': '切断済み',
    'mcpManager.reconnect': '再接続',
    'mcpManager.remove': '削除',
    'mcpManager.toolsAvailable': '個の利用可能ツール',
  },
}

// ── WebDAV Settings ──
const webdavSettings: Record<Locale, Record<string, string>> = {
  en: {
    'webdav.title': 'WebDAV Sync',
    'webdav.server': 'WebDAV Server',
    'webdav.configured': '✓ Configured',
    'webdav.lastSync': 'Last sync',
    'webdav.never': 'Never',
    'webdav.justNow': 'Just now',
    'webdav.syncData': 'Sync Data',
    'webdav.upload': 'Upload',
    'webdav.download': 'Download',
    'webdav.both': 'Both',
    'webdav.testConnection': 'Test Connection',
    'webdav.testing': 'Testing…',
    'webdav.saveConfig': 'Save Config',
    'webdav.removeConfig': 'Remove Config',
    'webdav.uploading': 'Uploading…',
    'webdav.downloading': 'Downloading…',
    'webdav.uploadToWebDAV': 'Upload to WebDAV',
    'webdav.downloadFromWebDAV': 'Download from WebDAV',
    'webdav.noConfig': 'No WebDAV server configured.',
    'webdav.noConfigHint': 'Enter your WebDAV server details above to enable cross-device sync.',
    'webdav.hidePassword': 'Hide password',
    'webdav.showPassword': 'Show password',
    'webdav.placeholderUrl': 'https://dav.example.com/remote.php/dav/',
    'webdav.placeholderUser': 'your-username',
    'webdav.placeholderPass': 'your-password',
    'webdav.placeholderMasked': '••••••••',
    'webdav.syncHint': 'Upload your current data to WebDAV, download data from WebDAV, or sync both ways.',
    'webdav.syncWarning': 'Downloading will replace your current data — make sure to export first if needed.',
    'webdav.serverHint': 'Enter your WebDAV server details to sync your Monday data across devices.',
  },
  zh: {
    'webdav.title': 'WebDAV 同步',
    'webdav.server': 'WebDAV 服务器',
    'webdav.configured': '✓ 已配置',
    'webdav.lastSync': '上次同步',
    'webdav.never': '从未',
    'webdav.justNow': '刚刚',
    'webdav.syncData': '同步数据',
    'webdav.upload': '上传',
    'webdav.download': '下载',
    'webdav.both': '双向',
    'webdav.testConnection': '测试连接',
    'webdav.testing': '测试中…',
    'webdav.saveConfig': '保存配置',
    'webdav.removeConfig': '移除配置',
    'webdav.uploading': '上传中…',
    'webdav.downloading': '下载中…',
    'webdav.uploadToWebDAV': '上传到 WebDAV',
    'webdav.downloadFromWebDAV': '从 WebDAV 下载',
    'webdav.noConfig': '没有配置 WebDAV 服务器。',
    'webdav.noConfigHint': '在上方输入你的 WebDAV 服务器信息以启用跨设备同步。',
    'webdav.hidePassword': '隐藏密码',
    'webdav.showPassword': '显示密码',
    'webdav.placeholderUrl': 'https://dav.example.com/remote.php/dav/',
    'webdav.placeholderUser': '你的用户名',
    'webdav.placeholderPass': '你的密码',
    'webdav.placeholderMasked': '••••••••',
    'webdav.syncHint': '将当前数据上传到 WebDAV，从 WebDAV 下载数据，或双向同步。',
    'webdav.syncWarning': '下载将替换你的当前数据 — 如有需要请先导出。',
    'webdav.serverHint': '输入你的 WebDAV 服务器信息以跨设备同步 Monday 数据。',
  },
  ja: {
    'webdav.title': 'WebDAV同期',
    'webdav.server': 'WebDAVサーバー',
    'webdav.configured': '✓ 設定済み',
    'webdav.lastSync': '最後の同期',
    'webdav.never': 'なし',
    'webdav.justNow': 'たった今',
    'webdav.syncData': 'データを同期',
    'webdav.upload': 'アップロード',
    'webdav.download': 'ダウンロード',
    'webdav.both': '両方',
    'webdav.testConnection': '接続をテスト',
    'webdav.testing': 'テスト中…',
    'webdav.saveConfig': '設定を保存',
    'webdav.removeConfig': '設定を削除',
    'webdav.uploading': 'アップロード中…',
    'webdav.downloading': 'ダウンロード中…',
    'webdav.uploadToWebDAV': 'WebDAVにアップロード',
    'webdav.downloadFromWebDAV': 'WebDAVからダウンロード',
    'webdav.noConfig': 'WebDAVサーバーが設定されていません。',
    'webdav.noConfigHint': '上記にWebDAVサーバーの詳細を入力して、デバイス間の同期を有効にしてください。',
    'webdav.hidePassword': 'パスワードを隠す',
    'webdav.showPassword': 'パスワードを表示',
    'webdav.placeholderUrl': 'https://dav.example.com/remote.php/dav/',
    'webdav.placeholderUser': 'ユーザー名',
    'webdav.placeholderPass': 'パスワード',
    'webdav.placeholderMasked': '••••••••',
    'webdav.syncHint': '現在のデータをWebDAVにアップロード、WebDAVからダウンロード、または双方向で同期します。',
    'webdav.syncWarning': 'ダウンロードは現在のデータを置き換えます — 必要に応じて先にエクスポートしてください。',
    'webdav.serverHint': 'Mondayのデータをデバイス間で同期するには、WebDAVサーバーの詳細を入力してください。',
  },
}

// ── Persona Marketplace ──
const personaMarketplace: Record<Locale, Record<string, string>> = {
  en: {
    'personaMarketplace.title': 'Persona Marketplace',
    'personaMarketplace.searchPlaceholder': 'Search personas…',
    'personaMarketplace.all': 'All',
    'personaMarketplace.back': 'Back to chat',
    'personaMarketplace.noResults': 'No personas found',
  },
  zh: {
    'personaMarketplace.title': '人格市场',
    'personaMarketplace.searchPlaceholder': '搜索人格…',
    'personaMarketplace.all': '全部',
    'personaMarketplace.back': '返回聊天',
    'personaMarketplace.noResults': '未找到人格',
  },
  ja: {
    'personaMarketplace.title': 'ペルソナマーケット',
    'personaMarketplace.searchPlaceholder': 'ペルソナを検索…',
    'personaMarketplace.all': 'すべて',
    'personaMarketplace.back': 'チャットに戻る',
    'personaMarketplace.noResults': 'ペルソナが見つかりません',
  },
}

// ── Model Comparison ──
const modelComparison: Record<Locale, Record<string, string>> = {
  en: {
    'modelComparison.title': 'Model Comparison',
    'modelComparison.compare': 'Compare',
    'modelComparison.back': 'Back to models',
    'modelComparison.placeholder': 'Enter a prompt to compare models…',
    'modelComparison.compareModels': 'Compare Models',
    'modelComparison.generating': 'Generating…',
    'modelComparison.stop': 'Stop',
    'modelComparison.reset': 'Reset',
    'modelComparison.generated': 'Generated Response',
    'modelComparison.tokenCount': 'tokens',
    'modelComparison.elapsed': 'elapsed',
    'modelComparison.tps': 'tok/s',
  },
  zh: {
    'modelComparison.title': '模型对比',
    'modelComparison.compare': '对比',
    'modelComparison.back': '返回模型',
    'modelComparison.placeholder': '输入提示词来对比模型…',
    'modelComparison.compareModels': '对比模型',
    'modelComparison.generating': '生成中…',
    'modelComparison.stop': '停止',
    'modelComparison.reset': '重置',
    'modelComparison.generated': '生成的回复',
    'modelComparison.tokenCount': 'tokens',
    'modelComparison.elapsed': '耗时',
    'modelComparison.tps': 'tok/s',
  },
  ja: {
    'modelComparison.title': 'モデル比較',
    'modelComparison.compare': '比較',
    'modelComparison.back': 'モデルに戻る',
    'modelComparison.placeholder': 'モデルを比較するプロンプトを入力…',
    'modelComparison.compareModels': 'モデルを比較',
    'modelComparison.generating': '生成中…',
    'modelComparison.stop': '停止',
    'modelComparison.reset': 'リセット',
    'modelComparison.generated': '生成された応答',
    'modelComparison.tokenCount': 'トークン',
    'modelComparison.elapsed': '経過',
    'modelComparison.tps': 'tok/s',
  },
}

// ── Tool Call Panel ──
const toolCallPanel: Record<Locale, Record<string, string>> = {
  en: {
    'toolCall.title': 'Tool Calls',
    'toolCall.input': 'Input',
    'toolCall.output': 'Output',
    'toolCall.latency': 'Latency',
    'toolCall.args': 'Arguments',
    'toolCall.result': 'Result',
  },
  zh: {
    'toolCall.title': '工具调用',
    'toolCall.input': '输入',
    'toolCall.output': '输出',
    'toolCall.latency': '延迟',
    'toolCall.args': '参数',
    'toolCall.result': '结果',
  },
  ja: {
    'toolCall.title': 'ツール呼び出し',
    'toolCall.input': '入力',
    'toolCall.output': '出力',
    'toolCall.latency': 'レイテンシ',
    'toolCall.args': '引数',
    'toolCall.result': '結果',
  },
}

// ── Tool Call Inspector ──
const toolCallInspector: Record<Locale, Record<string, string>> = {
  en: {
    'toolCallInspector.title': 'Tool Call Inspector',
    'toolCallInspector.rawJson': 'Raw JSON',
    'toolCallInspector.copy': 'Copy',
    'toolCallInspector.success': 'Success',
    'toolCallInspector.error': 'Error',
    'toolCallInspector.noCalls': 'No tool calls yet.',
  },
  zh: {
    'toolCallInspector.title': '工具调用检查器',
    'toolCallInspector.rawJson': '原始 JSON',
    'toolCallInspector.copy': '复制',
    'toolCallInspector.success': '成功',
    'toolCallInspector.error': '错误',
    'toolCallInspector.noCalls': '暂无工具调用。',
  },
  ja: {
    'toolCallInspector.title': 'ツール呼び出しインスペクター',
    'toolCallInspector.rawJson': '生JSON',
    'toolCallInspector.copy': 'コピー',
    'toolCallInspector.success': '成功',
    'toolCallInspector.error': 'エラー',
    'toolCallInspector.noCalls': 'ツール呼び出しはありません。',
  },
}

// ── Knowledge Panel ──
const knowledgePanel: Record<Locale, Record<string, string>> = {
  en: {
    'knowledgePanel.back': 'Back to chat',
    'knowledgePanel.uploadDocs': 'Upload Documents',
    'knowledgePanel.search': 'Search',
    'knowledgePanel.indexStatus': 'Indexed {count} chunks',
    'knowledgePanel.reIndex': 'Re-index',
    'knowledgePanel.noDocs': 'No documents yet. Upload files to build your knowledge base.',
    'knowledgePanel.loading': 'Parsing documents…',
    'knowledgePanel.activeBase': '📌 Active base:',
    'knowledgePanel.error': 'Error',
    'knowledgePanel.noResults': 'No results',
    'knowledgePanel.clearIndex': 'Clear Index',
    'knowledgePanel.clearDocs': 'Clear All',
    'knowledgePanel.clearDocsConfirm': 'Clear all documents?',
    'knowledgePanel.clearIndexConfirm': 'Clear the vector index?',
    'knowledgePanel.noBase': 'No active knowledge base',
    'knowledgePanel.clearBase': 'Clear',
    'knowledgePanel.createBase': 'Create Base',
    'knowledgePanel.baseName': 'Base name',
    'knowledgePanel.addDoc': 'Add to base',
    'knowledgePanel.removeDoc': 'Remove from base',
  },
  zh: {
    'knowledgePanel.back': '返回聊天',
    'knowledgePanel.uploadDocs': '上传文档',
    'knowledgePanel.search': '搜索',
    'knowledgePanel.indexStatus': '已索引 {count} 个片段',
    'knowledgePanel.reIndex': '重新索引',
    'knowledgePanel.noDocs': '还没有文档。上传文件来构建知识库。',
    'knowledgePanel.loading': '解析文档中…',
    'knowledgePanel.activeBase': '📌 活跃知识库：',
    'knowledgePanel.error': '错误',
    'knowledgePanel.noResults': '无结果',
    'knowledgePanel.clearIndex': '清除索引',
    'knowledgePanel.clearDocs': '清除全部',
    'knowledgePanel.clearDocsConfirm': '清除所有文档？',
    'knowledgePanel.clearIndexConfirm': '清除向量索引？',
    'knowledgePanel.noBase': '无活跃知识库',
    'knowledgePanel.clearBase': '清除',
    'knowledgePanel.createBase': '创建知识库',
    'knowledgePanel.baseName': '知识库名称',
    'knowledgePanel.addDoc': '添加到知识库',
    'knowledgePanel.removeDoc': '从知识库移除',
  },
  ja: {
    'knowledgePanel.back': 'チャットに戻る',
    'knowledgePanel.uploadDocs': 'ドキュメントをアップロード',
    'knowledgePanel.search': '検索',
    'knowledgePanel.indexStatus': '{count}チャンクをインデックス済み',
    'knowledgePanel.reIndex': '再インデックス',
    'knowledgePanel.noDocs': 'まだドキュメントがありません。ファイルをアップロードしてナレッジベースを構築してください。',
    'knowledgePanel.loading': 'ドキュメントを解析中…',
    'knowledgePanel.activeBase': '📌 有効なベース:',
    'knowledgePanel.error': 'エラー',
    'knowledgePanel.noResults': '結果なし',
    'knowledgePanel.clearIndex': 'インデックスをクリア',
    'knowledgePanel.clearDocs': 'すべてクリア',
    'knowledgePanel.clearDocsConfirm': 'すべてのドキュメントをクリアしますか？',
    'knowledgePanel.clearIndexConfirm': 'ベクターインデックスをクリアしますか？',
    'knowledgePanel.noBase': '有効なナレッジベースなし',
    'knowledgePanel.clearBase': 'クリア',
    'knowledgePanel.createBase': 'ベースを作成',
    'knowledgePanel.baseName': 'ベース名',
    'knowledgePanel.addDoc': 'ベースに追加',
    'knowledgePanel.removeDoc': 'ベースから削除',
  },
}

// ── Memory Panel ──
const memoryPanel: Record<Locale, Record<string, string>> = {
  en: {
    'memoryPanel.title': 'Memory',
    'memoryPanel.back': 'Back to chat',
    'memoryPanel.compress': 'Compress',
    'memoryPanel.cancel': 'Cancel',
    'memoryPanel.noSummaries': 'No summaries yet',
    'memoryPanel.estimatedTokens': 'Estimated tokens',
    'memoryPanel.needsSummarization': 'Context is full — compress to free space',
    'memoryPanel.summarizing': 'Compressing…',
    'memoryPanel.contextFull': 'Context full',
  },
  zh: {
    'memoryPanel.title': '记忆',
    'memoryPanel.back': '返回聊天',
    'memoryPanel.compress': '压缩',
    'memoryPanel.cancel': '取消',
    'memoryPanel.noSummaries': '暂无摘要',
    'memoryPanel.estimatedTokens': '估计 tokens',
    'memoryPanel.needsSummarization': '上下文已满 — 压缩以释放空间',
    'memoryPanel.summarizing': '压缩中…',
    'memoryPanel.contextFull': '上下文已满',
  },
  ja: {
    'memoryPanel.title': 'メモリ',
    'memoryPanel.back': 'チャットに戻る',
    'memoryPanel.compress': '圧縮',
    'memoryPanel.cancel': 'キャンセル',
    'memoryPanel.noSummaries': 'サマリーなし',
    'memoryPanel.estimatedTokens': '推定トークン',
    'memoryPanel.needsSummarization': 'コンテキストが一杯 — 領域を空けるために圧縮',
    'memoryPanel.summarizing': '圧縮中…',
    'memoryPanel.contextFull': 'コンテキストがいっぱい',
  },
}

// ── WebGPU Check ──
const webgpuCheck: Record<Locale, Record<string, string>> = {
  en: {
    'webgpu.title': 'WebGPU not supported',
    'webgpu.hint': 'Your browser does not support WebGPU. Models will run slowly via WASM. For the best experience, use Chrome 113+ or Edge 113+.',
  },
  zh: {
    'webgpu.title': '不支持 WebGPU',
    'webgpu.hint': '你的浏览器不支持 WebGPU。模型将通过 WASM 缓慢运行。要获得最佳体验，请使用 Chrome 113+ 或 Edge 113+。',
  },
  ja: {
    'webgpu.title': 'WebGPUがサポートされていません',
    'webgpu.hint': 'お使いのブラウザはWebGPUをサポートしていません。モデルはWASMで低速実行されます。最適な体験にはChrome 113+またはEdge 113+を使用してください。',
  },
}

// ── Cache Manager ──
const cacheManager: Record<Locale, Record<string, string>> = {
  en: {
    'cacheManager.loading': 'Loading cache info...',
    'cacheManager.noModels': 'No cached models found.',
    'cacheManager.deleteConfirm': 'Delete this model cache?',
    'cacheManager.delete': 'Delete',
    'cacheManager.total': 'Total',
    'cacheManager.size': 'Size',
    'cacheManager.actions': 'Actions',
  },
  zh: {
    'cacheManager.loading': '加载缓存信息…',
    'cacheManager.noModels': '未找到缓存模型。',
    'cacheManager.deleteConfirm': '删除此模型缓存？',
    'cacheManager.delete': '删除',
    'cacheManager.total': '总计',
    'cacheManager.size': '大小',
    'cacheManager.actions': '操作',
  },
  ja: {
    'cacheManager.loading': 'キャッシュ情報を読み込み中…',
    'cacheManager.noModels': 'キャッシュされたモデルが見つかりません。',
    'cacheManager.deleteConfirm': 'このモデルキャッシュを削除しますか？',
    'cacheManager.delete': '削除',
    'cacheManager.total': '合計',
    'cacheManager.size': 'サイズ',
    'cacheManager.actions': '操作',
  },
}

// ── Model Stats ──
const modelStats: Record<Locale, Record<string, string>> = {
  en: {
    'modelStats.title': 'Usage Statistics',
    'modelStats.totalUsage': 'Total Usage',
    'modelStats.modelsUsed': 'Models Used',
    'modelStats.topModel': 'Top Model',
    'modelStats.peakDay': 'Peak Day',
    'modelStats.weeklyUsage': 'Weekly Usage (Last 7 Days)',
    'modelStats.byProvider': 'Usage by Provider',
    'modelStats.noData': 'No usage data yet',
    'modelStats.resetRecommendations': 'Reset Recommendations',
    'modelStats.resetRecentModels': 'Reset Recent Models',
    'modelStats.totalTokens': 'Total Tokens',
    'modelStats.totalSessions': 'Total Sessions',
    'modelStats.peakDayLabel': 'Peak Day',
  },
  zh: {
    'modelStats.title': '使用统计',
    'modelStats.totalUsage': '总使用量',
    'modelStats.modelsUsed': '使用模型数',
    'modelStats.topModel': '最常用模型',
    'modelStats.peakDay': '峰值日',
    'modelStats.weeklyUsage': '每周使用量（最近 7 天）',
    'modelStats.byProvider': '按提供商统计',
    'modelStats.noData': '暂无使用数据',
    'modelStats.resetRecommendations': '重置推荐',
    'modelStats.resetRecentModels': '重置最近模型',
    'modelStats.totalTokens': '总 Tokens',
    'modelStats.totalSessions': '总会话',
    'modelStats.peakDayLabel': '峰值日',
  },
  ja: {
    'modelStats.title': '利用統計',
    'modelStats.totalUsage': '総利用',
    'modelStats.modelsUsed': '使用モデル',
    'modelStats.topModel': 'トップモデル',
    'modelStats.peakDay': 'ピーク日',
    'modelStats.weeklyUsage': '週間利用（過去7日間）',
    'modelStats.byProvider': 'プロバイダー別利用',
    'modelStats.noData': 'データなし',
    'modelStats.resetRecommendations': '推奨をリセット',
    'modelStats.resetRecentModels': '最近のモデルをリセット',
    'modelStats.totalTokens': '総トークン',
    'modelStats.totalSessions': '総セッション',
    'modelStats.peakDayLabel': 'ピーク日',
  },
}

// ── Persona Publish ──
const personaPublish: Record<Locale, Record<string, string>> = {
  en: {
    'personaPublish.title': 'Publish Persona',
    'personaPublish.back': 'Back',
    'personaPublish.jsonHint': 'file. Add your entry to the <code>PERSONA_REGISTRY</code> array.',
    'personaPublish.success': 'Persona published successfully!',
    'personaPublish.error': 'Failed to publish persona',
    'personaPublish.preview': 'Preview',
    'personaPublish.name': 'Name',
    'personaPublish.description': 'Description',
    'personaPublish.systemPrompt': 'System Prompt',
    'personaPublish.icon': 'Icon',
  },
  zh: {
    'personaPublish.title': '发布人格',
    'personaPublish.back': '返回',
    'personaPublish.jsonHint': '文件。将你的条目添加到 <code>PERSONA_REGISTRY</code> 数组中。',
    'personaPublish.success': '人格发布成功！',
    'personaPublish.error': '发布人格失败',
    'personaPublish.preview': '预览',
    'personaPublish.name': '名称',
    'personaPublish.description': '描述',
    'personaPublish.systemPrompt': '系统提示',
    'personaPublish.icon': '图标',
  },
  ja: {
    'personaPublish.title': 'ペルソナ公開',
    'personaPublish.back': '戻る',
    'personaPublish.jsonHint': 'ファイル。<code>PERSONA_REGISTRY</code>配列にエントリを追加してください。',
    'personaPublish.success': 'ペルソナが公開されました！',
    'personaPublish.error': 'ペルソナの公開に失敗しました',
    'personaPublish.preview': 'プレビュー',
    'personaPublish.name': '名前',
    'personaPublish.description': '説明',
    'personaPublish.systemPrompt': 'システムプロンプト',
    'personaPublish.icon': 'アイコン',
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
    ...analyticsPanel[locale],
    ...knowledge[locale],
    ...knowledgePanel[locale],
    ...memory[locale],
    ...memoryPanel[locale],
    ...settings[locale],
    ...msgList[locale],
    ...cache[locale],
    ...cacheManager[locale],
    ...banner[locale],
    ...webdav[locale],
    ...webdavSettings[locale],
    ...mcp[locale],
    ...mcpManager[locale],
    ...plugin[locale],
    ...pluginManager[locale],
    ...persona[locale],
    ...personaMarketplace[locale],
    ...personaPublish[locale],
    ...modelComparison[locale],
    ...toolCallPanel[locale],
    ...toolCallInspector[locale],
    ...customModel[locale],
    ...webgpu[locale],
    ...webgpuCheck[locale],
    ...quickPrompts[locale],
    ...modelSelector[locale],
    ...modelSelectorPanel[locale],
    ...modelStats[locale],
    ...benchmark[locale],
    ...shortcuts[locale],
    ...agentPanel[locale],
    ...batchGen[locale],
    ...changelog[locale],
    ...offlineIndicator[locale],
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
