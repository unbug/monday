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
