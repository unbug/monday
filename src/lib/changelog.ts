export interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed'
    text: string
  }[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.9.0',
    date: '2026-04-23',
    title: 'Usage Statistics Dashboard',
    description:
      'New usage statistics dashboard to track model usage over time — view daily charts, per-model breakdown, and provider-level analytics.',
    changes: [
      { type: 'added', text: 'Usage Statistics dashboard (default landing page) — overview of total usage, models used, top model, and peak usage day' },
      { type: 'added', text: 'Weekly usage chart — bar chart showing daily usage over the last 7 days' },
      { type: 'added', text: 'All-time usage breakdown — horizontal bars showing usage count per model' },
      { type: 'added', text: 'Usage by provider chart — aggregated bar chart showing usage across model providers' },
      { type: 'added', text: 'Daily usage history tracking — records usage per day for date-based analytics' },
      { type: 'added', text: 'Peak day detection — identifies the day with highest usage' },
      { type: 'added', text: 'Quick nav buttons in sidebar — one-click access to Stats and Changelog' },
      { type: 'added', text: 'Usage Statistics command in Command Palette (⌘K)' },
      { type: 'changed', text: 'Updated default view to Usage Statistics' },
      { type: 'changed', text: 'Updated version to v0.9.0' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-04-23',
    title: 'Model Recommendations & Session Search',
    description:
      'Personalized model recommendations based on your usage history, plus powerful session search with date filtering to quickly find conversations.',
    changes: [
      { type: 'added', text: 'Model usage tracking — automatically counts how many times each model is loaded and used' },
      { type: 'added', text: 'Recommended for you section in Model Selector — top 3 most-used models displayed at the top of the models page' },
      { type: 'added', text: 'Reset recommendations button — clear usage history to reset model recommendations' },
      { type: 'added', text: 'Session search — search conversations by title in the sidebar' },
      { type: 'added', text: 'Date filter — filter sessions by Today, Yesterday, This Week, or This Month' },
      { type: 'added', text: 'Result count indicator — shows filtered count (e.g., "3 of 12 conversations")' },
      { type: 'added', text: 'Reset Model Recommendations command in Command Palette (⌘K)' },
      { type: 'changed', text: 'Updated version to v0.8.0' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-22',
    title: 'Prompt Templates & Personas',
    description:
      'Apply pre-built personas (Coding Assistant, Translator, Tutor, etc.) to shape the AI\'s behavior. Create custom personas, use slash commands, and browse personas by category.',
    changes: [
      { type: 'added', text: 'Built-in prompt templates — 8 pre-configured personas (Coding Assistant, Code Explainer, Translator, Personal Tutor, Writing Assistant, Brainstorm Partner, Devil\'s Advocate, Summarizer)' },
      { type: 'added', text: 'QuickPrompts panel — browse personas in the sidebar with category filtering and search' },
      { type: 'added', text: 'Custom persona creation — create and save your own personas with custom icons, names, and system prompts' },
      { type: 'added', text: 'Slash commands — type /code, /translate, /tutor, etc. in the chat input to quickly apply a persona' },
      { type: 'added', text: 'Slash hint popup — typing / shows available persona shortcuts above the input' },
      { type: 'added', text: 'Persona persistence — custom personas saved to localStorage, survive browser restarts' },
      { type: 'added', text: 'Active persona indicator — visual dot shows which persona is currently active' },
      { type: 'added', text: 'Persona system prompt merging — persona prompt is prepended to the session\'s system prompt' },
      { type: 'added', text: 'Persona clearing — one-click to remove the active persona from a session' },
      { type: 'changed', text: 'Updated version to v0.7.0' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-04-22',
    title: 'Command Palette & Model Cache Management',
    description:
      'New command palette (⌘K) for quick navigation, plus model cache management to view and delete downloaded models from browser storage.',
    changes: [
      { type: 'added', text: 'Command Palette — press ⌘K to open a quick-access command menu for navigating between features' },
      { type: 'added', text: 'Keyboard shortcuts — ⌘K (command palette), ⌘N (new chat), ⌘⇧S (stop generation), Escape (close)' },
      { type: 'added', text: 'Model Cache Manager — view cached models with disk usage, delete individual or all caches' },
      { type: 'added', text: 'Cache link in Model Selector — quick access to cache management from the models page' },
      { type: 'added', text: 'Keyboard shortcut hint in header — shows ⌘K shortcut with hover effect' },
      { type: 'added', text: 'formatBytes utility — human-readable file size formatting' },
      { type: 'changed', text: 'Updated version to v0.6.0' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-22',
    title: 'Message Actions — Edit & Regenerate',
    description:
      'User messages now have inline edit and regenerate actions — hover over your message to edit text or regenerate the assistant\'s response.',
    changes: [
      { type: 'added', text: 'MessageActions component — hover to reveal Edit and Regenerate buttons on user messages' },
      { type: 'added', text: 'Inline message editing — click Edit to modify your message with a textarea, Save/Cancel buttons' },
      { type: 'added', text: 'Regenerate response — re-send the last user message to generate a fresh assistant response' },
      { type: 'added', text: 'Keyboard shortcuts — Enter to save edit, Escape to cancel' },
      { type: 'added', text: 'Regenerate button disabled while streaming to prevent conflicts' },
      { type: 'added', text: 'Refactored useChat — extracted sendUserMessage internal function shared by sendMessage and regenerateMessage' },
      { type: 'changed', text: 'Updated version to v0.5.0' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-04-21',
    title: 'Token Counter & Performance Metrics',
    description:
      'Real-time token counting and performance metrics during generation — see tokens/sec, elapsed time, and total token count as the model generates responses.',
    changes: [
      { type: 'added', text: 'Token counter hook (useTokenStats) — tracks tokens/sec, elapsed time, and session token count' },
      { type: 'added', text: 'Live performance stats displayed in chat input during generation (tokens/sec, elapsed time, token count)' },
      { type: 'added', text: 'streamChatWithUsage — captures Web-LLM usage stats from streaming chunks' },
      { type: 'added', text: 'Token stats auto-reset on new session, session switch, and session delete' },
      { type: 'added', text: 'Styled token stats pills with icons (dark/light theme support)' },
      { type: 'changed', text: 'Updated version to v0.4.0' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-04-21',
    title: 'Generation Parameters & System Prompts',
    description:
      'Users can now fine-tune model behavior with per-session generation parameters (temperature, top-p, max tokens) and custom system prompts — all persisted across sessions.',
    changes: [
      { type: 'added', text: 'Generation parameters panel (temperature, top-p, max tokens) with sliders' },
      { type: 'added', text: 'Per-session customizable system prompt (persisted in IndexedDB)' },
      { type: 'added', text: 'Migration system for existing sessions — old chats automatically get default params' },
      { type: 'added', text: 'Reset button to restore default generation parameters' },
      { type: 'added', text: 'Visual indicator (dot) when custom parameters are active' },
      { type: 'changed', text: 'Updated version to v0.3.0' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-04-21',
    title: 'Markdown Rendering & Chat Export',
    description:
      'Major UX improvements: assistant responses now render as rich Markdown with code highlighting, and conversations can be exported as Markdown files.',
    changes: [
      { type: 'added', text: 'Markdown rendering for assistant messages (headings, lists, bold, italic, links)' },
      { type: 'added', text: 'Syntax-highlighted code blocks with language detection and copy button' },
      { type: 'added', text: 'Inline code styling with monospace font' },
      { type: 'added', text: 'LaTeX math equation support via KaTeX (inline $...$ and display $$...$$)' },
      { type: 'added', text: 'GitHub Flavored Markdown (tables, strikethrough, task lists)' },
      { type: 'added', text: 'Message copy button (appears on hover for user messages)' },
      { type: 'added', text: 'Smart auto-scroll control — pauses when user scrolls up, resumes during streaming' },
      { type: 'added', text: 'Export current conversation as Markdown file' },
      { type: 'added', text: 'Export all conversations as a single Markdown file' },
      { type: 'changed', text: 'Updated version to v0.2.0' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-06-15',
    title: 'Initial Release',
    description:
      'First public release of Monday - Browser AI Chat. Core chat functionality with WebGPU-powered local inference.',
    changes: [
      { type: 'added', text: 'Browser-native AI inference via Web-LLM (WebGPU + WASM)' },
      { type: 'added', text: '7 pre-configured models: Qwen 2.5, SmolLM2, Gemma 2, Phi 3.5, TinyLlama' },
      { type: 'added', text: 'Real-time token streaming with async generators' },
      { type: 'added', text: 'Multi-session chat management with IndexedDB persistence' },
      { type: 'added', text: 'Model selector with download progress tracking' },
      { type: 'added', text: 'BorderBeam animated UI effects (ocean, colorful, mono variants)' },
      { type: 'added', text: 'Light / Dark / System theme toggle with localStorage' },
      { type: 'added', text: 'Responsive sidebar with session CRUD' },
      { type: 'added', text: 'WebGPU capability detection and fallback warning' },
      { type: 'added', text: 'GitHub Pages deployment via GitHub Actions' },
      { type: 'added', text: '100% client-side — zero data leaves the browser' },
    ],
  },
]
