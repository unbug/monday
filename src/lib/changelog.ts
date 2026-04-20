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
