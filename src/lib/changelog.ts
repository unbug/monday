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
    version: '0.21.0',
    date: '2026-04-25',
    title: 'TTS Output — Read Responses Aloud',
    description:
      'Assistant responses can now be read aloud using the Web Speech Synthesis API. Click the speaker icon on any message to hear it — no server, no install, 100% private.',
    changes: [
      { type: 'added', text: 'TTSButton component — speaker icon on assistant messages, click to read aloud' },
      { type: 'added', text: 'useTTSOutput hook — manages Speech Synthesis lifecycle (speak/pause/resume/stop)' },
      { type: 'added', text: 'Browser support detection — button hidden on unsupported browsers' },
      { type: 'added', text: 'Playback controls — play/pause/resume toggle + stop button during playback' },
      { type: 'added', text: 'Visual feedback — active playback state with icon changes and hover styling' },
      { type: 'changed', text: 'Updated version to v0.21.0' },
    ],
  },
  {
    version: '0.20.0',
    date: '2026-04-25',
    title: 'Voice Input — Speak Your Messages',
    description:
      'Type less, speak more. Voice input lets you dictate messages directly in the browser using the Web Speech Recognition API — no server, no install, 100% private.',
    changes: [
      { type: 'added', text: 'Voice input button in ChatInput — microphone icon toggles speech recognition' },
      { type: 'added', text: 'useVoiceInput hook — manages Speech Recognition lifecycle (start/stop/error handling)' },
      { type: 'added', text: 'Real-time transcription — interim results shown while speaking, final results appended to input' },
      { type: 'added', text: 'Interim transcript preview — live text shown below input while listening' },
      { type: 'added', text: 'Listening animation — pulsing red glow when actively recording' },
      { type: 'added', text: 'Browser language detection — uses navigator.language instead of hardcoded en-US' },
      { type: 'added', text: 'Browser support detection — button hidden on unsupported browsers (Firefox, Safari)' },
      { type: 'added', text: 'Error handling — microphone permission denied, no speech detected, unsupported browser' },
      { type: 'changed', text: 'Updated version to v0.20.0' },
    ],
  },
  {
    version: '0.19.0',
    date: '2026-04-25',
    title: 'Image Input — Paste or Upload Images for Vision Models',
    description:
      'Vision models can now accept image input — paste from clipboard, upload from files, or drag-and-drop. Images are compressed and converted to base64 for local inference.',
    changes: [
      { type: 'added', text: 'Image input — paste images from clipboard or upload from files in the chat input' },
      { type: 'added', text: 'ImagePreview component — thumbnail gallery with remove individual / clear all buttons' },
      { type: 'added', text: 'Image compression — canvas-based resize to 1920px max, webp→jpeg fallback, caps at ~1MB' },
      { type: 'added', text: 'Vision model detection — image button only shown when model has vision tag' },
      { type: 'added', text: 'Engine vision support — toVisionMessages() converts last user message to multimodal format for Web-LLM' },
      { type: 'added', text: 'ChatMessageImage type — base64 image data URL with optional name' },
      { type: 'added', text: 'Llama 3.2 11B Vision model added to registry — multimodal model with vision tag' },
      { type: 'changed', text: 'Updated version to v0.19.0' },
    ],
  },
  {
    version: '0.18.0',
    date: '2026-04-25',
    title: 'ArtifactsPreview & CodeRunner — Interactive Code Preview',
    description:
      'Code blocks can now be run and previewed directly in the chat — JavaScript/TypeScript code runs in a sandboxed iframe with console output capture, and HTML/SVG code renders as an expandable inline preview.',
    changes: [
      { type: 'added', text: 'CodeRunner — JS/TS code blocks get a "Run" button with sandboxed iframe execution and console output capture' },
      { type: 'added', text: 'ArtifactsPreview — HTML/SVG code blocks get expandable inline preview with tabbed code view' },
      { type: 'added', text: 'codeBlocks.ts utility — isJsLanguage(), isPreviewable(), extractCodeBlocks()' },
      { type: 'added', text: 'InlineArtifact component — collapsible preview for HTML/SVG code blocks in MarkdownRenderer' },
      { type: 'changed', text: 'Updated version to v0.18.0' },
    ],
  },
  {
    version: '0.17.0',
    date: '2026-04-25',
    title: 'PWA Offline Support — Full Service Worker Caching',
    description:
      'Monday now works fully offline with a service worker that precaches the app shell and intelligently caches model files and fonts for instant loading.',
    changes: [
      { type: 'added', text: 'App shell precaching — all HTML, CSS, JS, and assets cached via service worker for offline access' },
      { type: 'added', text: 'HuggingFace model caching — NetworkFirst strategy with 10s timeout, 7-day expiration for model file downloads' },
      { type: 'added', text: 'Google Fonts caching — CacheFirst strategy with 1-year expiration for font files' },
      { type: 'added', text: 'Auto-update registration — service worker auto-registers and updates on page load' },
      { type: 'changed', text: 'Fixed registerType from invalid autoRegister to autoUpdate' },
      { type: 'changed', text: 'Updated version to v0.17.0' },
    ],
  },
  {
    version: '0.16.0',
    date: '2026-04-25',
    title: 'Persona Marketplace — Browse & Apply Community Personas',
    description:
      'Discover and apply community-shared personas directly from a built-in marketplace — browse by category, search, and one-click apply to shape your AI\'s behavior.',
    changes: [
      { type: 'added', text: 'Persona Marketplace view — browse 14 community personas across 4 categories (Coding, Writing, Analysis, Creative)' },
      { type: 'added', text: 'Category filtering — filter personas by Coding, Writing, Analysis, or Creative' },
      { type: 'added', text: 'Persona search — search by name, description, or tags' },
      { type: 'added', text: 'One-click apply — apply any persona to the current session from the marketplace' },
      { type: 'added', text: 'Persona registry — 14 new personas with detailed system prompts and tags' },
      { type: 'added', text: 'Persona Marketplace nav button in sidebar — user icon quick access' },
      { type: 'added', text: 'Persona Marketplace nav buttons in Model Selector — quick access from models page' },
      { type: 'added', text: 'Persona Marketplace command in Command Palette (⌘K)' },
      { type: 'changed', text: 'Updated version to v0.16.0' },
    ],
  },
  {
    version: '0.15.0',
    date: '2026-04-25',
    title: 'Context Injection — Attach Code, Docs, and Notes',
    description:
      'Attach text or code snippets as context before sending messages — context is prepended to the first user message during generation and persisted across page refreshes.',
    changes: [
      { type: 'added', text: 'ContextPanel component — collapsible panel above the chat input for attaching context (code, docs, notes)' },
      { type: 'added', text: 'Context persistence — stored in localStorage per session, survives page refresh' },
      { type: 'added', text: 'Context auto-expiry — entries older than 7 days are automatically cleared' },
      { type: 'added', text: 'Character count indicator — live count displayed in the context panel header' },
      { type: 'added', text: 'Collapsed pill state — compact pill with char count when panel is minimized' },
      { type: 'changed', text: 'sendMessage now accepts an optional context parameter for prepending to generation' },
      { type: 'changed', text: 'streamChatWithUsage prepends context as a user message before the system prompt' },
      { type: 'changed', text: 'Updated version to v0.15.0' },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-04-25',
    title: 'Download Resume — Pick Up Where You Left Off',
    description:
      'Model downloads can now be resumed from where they were interrupted, so you never lose progress on large model downloads.',
    changes: [
      { type: 'added', text: 'Download Resume feature — when a model download fails or is interrupted, a "Resume Download" button appears with the saved progress percentage' },
      { type: 'added', text: 'Progress persistence — download progress is saved to localStorage automatically during model download' },
      { type: 'added', text: 'Auto-expire — saved download state expires after 24 hours to prevent stale entries' },
      { type: 'added', text: 'Visual progress bar — shows exact download percentage while resuming' },
      { type: 'changed', text: 'Updated version to v0.14.0' },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-04-24',
    title: 'Model Benchmark & Custom Model Import',
    description:
      'Measure model performance with a built-in benchmark tool, and load custom MLC-compiled models from any HuggingFace URL.',
    changes: [
      { type: 'added', text: 'Model Benchmark view — select a model and run a standardized test prompt to measure tokens/sec, total tokens, and latency' },
      { type: 'added', text: 'Real-time benchmark progress — see tokens/sec update live as the model generates' },
      { type: 'added', text: 'Benchmark results display — stats cards (tokens/sec, total tokens, latency) + collapsible generated response' },
      { type: 'added', text: 'Custom Model Import — paste a HuggingFace model ID/URL to load an MLC-compiled model not in the registry' },
      { type: 'added', text: 'Custom model import progress bar and status indicators (loading/ready/error)' },
      { type: 'added', text: 'Benchmark and Custom Model Import commands in Command Palette (⌘K)' },
      { type: 'added', text: 'Quick nav buttons in sidebar — lightning bolt (Benchmark) and layers icon (Custom Model Import)' },
      { type: 'added', text: 'Benchmark prompt — standardized test prompt for consistent model comparison' },
      { type: 'changed', text: 'Updated version to v0.13.0' },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-04-24',
    title: 'Recent Models & Storage Quota Indicator',
    description:
      'Quickly access recently used models from the Model Selector, plus a storage quota indicator in the sidebar to monitor localStorage usage.',
    changes: [
      { type: 'added', text: 'Recent Models section in Model Selector — shows last 5 recently used models as quick-access cards' },
      { type: 'added', text: 'Recent model tracking — automatically records each model load with timestamp' },
      { type: 'added', text: 'Recent models expire after 30 days — stale entries are automatically filtered' },
      { type: 'added', text: 'Reset Recent Models button — clear recent model history' },
      { type: 'added', text: 'Storage quota indicator in sidebar footer — shows localStorage usage with disk icon' },
      { type: 'added', text: 'Reset Recent Models command in Command Palette (⌘K)' },
      { type: 'changed', text: 'Updated version to v0.12.0' },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-04-24',
    title: 'Theme Optimization — Visual Depth & Polish',
    description:
      'Major visual overhaul of both dark and light themes: enhanced color depth, refined shadows, improved message bubble hierarchy, smoother transitions, and polished component-level details for a more immersive experience.',
    changes: [
      { type: 'changed', text: 'Dark theme — deeper background (#030308), richer surface layers, enhanced purple glow effects' },
      { type: 'changed', text: 'Light theme — warmer tones (#f4f4f8), refined shadows, improved contrast and readability' },
      { type: 'changed', text: 'Enhanced body background with multi-layer radial gradients for both themes' },
      { type: 'changed', text: 'Sidebar — depth gradient overlay, left indicator for active session, refined border' },
      { type: 'changed', text: 'Header — subtle top gradient accent line, enhanced backdrop blur' },
      { type: 'changed', text: 'Model cards — inner glow, hover lift effect (2px), gradient overlay on hover' },
      { type: 'changed', text: 'Message bubbles — user messages with purple gradient overlay, assistant messages with depth shadows' },
      { type: 'changed', text: 'Code blocks — enhanced shadows, subtle top accent line, improved dark/light contrast' },
      { type: 'changed', text: 'Chat input — inner glow gradient, top gradient accent line, enhanced focus state' },
      { type: 'changed', text: 'Command palette — enhanced backdrop blur, refined shadows with subtle glow' },
      { type: 'changed', text: 'Model badge — gradient glow behind badge, enhanced in both themes' },
      { type: 'changed', text: 'Model sort group — inner gradient overlay for depth' },
      { type: 'changed', text: 'Settings panel — enhanced inset shadows for better depth perception' },
      { type: 'changed', text: 'Theme transition overlay — smooth crossfade effect when switching themes' },
      { type: 'changed', text: 'Updated version to v0.11.0' },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-04-23',
    title: 'Model Comparison — Side-by-Side Benchmarking',
    description:
      'Compare two models head-to-head: select any pair, enter a prompt, and watch both models generate responses simultaneously with real-time token stats.',
    changes: [
      { type: 'added', text: 'Model Comparison view — select two models and compare their responses side by side' },
      { type: 'added', text: 'Sequential comparison engine — Model A generates first, then Model B, both with the same prompt' },
      { type: 'added', text: 'Real-time token stats — tokens/sec, total tokens, and elapsed time for each model' },
      { type: 'added', text: 'Live streaming display — see both models generate in real-time with blinking cursor' },
      { type: 'added', text: 'Stop button — interrupt comparison mid-generation' },
      { type: 'added', text: 'Markdown rendering for comparison results — code highlighting, bold, italic via react-markdown' },
      { type: 'added', text: 'Model Comparison command in Command Palette (⌘K)' },
      { type: 'added', text: 'Quick nav button in sidebar — one-click access to Model Comparison' },
      { type: 'added', text: 'Compare Another Pair button — reset and select a new model pair' },
      { type: 'changed', text: 'Updated version to v0.10.0' },
    ],
  },
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
