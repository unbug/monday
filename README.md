# Monday - Browser AI Chat

Run open-source AI models directly in your browser. No server, no install, 100% private.

## Features

- **Zero Install**: Pure browser experience, no downloads needed
- **Browser-Native Inference**: Models run locally via WebGPU + WASM using [Web-LLM](https://github.com/mlc-ai/web-llm)
- **HuggingFace Models**: Small models optimized for browser (Qwen 0.5B, SmolLM, Phi-3.5, Gemma 2B, etc.)
- **Chat Interface**: OpenWebUI-inspired conversational UI
- **Streaming Output**: Token-by-token response streaming
- **Chat History**: Persistent conversations via IndexedDB
- **100% Private**: Nothing leaves your browser

## Tech Stack

- Vite + React + TypeScript
- @mlc-ai/web-llm (WebGPU/WASM runtime)
- IndexedDB for persistence
- GitHub Pages deployment

## Development

```bash
npm install
npm run dev
npm run build
```

## Requirements

- Chrome 113+ or Edge 113+ (WebGPU support required)
- GPU with 2GB+ VRAM recommended

## License

MIT
