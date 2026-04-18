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
