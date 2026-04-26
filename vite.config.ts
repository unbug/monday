import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Monday - Browser AI Chat',
        short_name: 'Monday',
        description:
          'Run open-source AI models directly in your browser. No server, no install, 100% private.',
        theme_color: '#a78bfa',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/monday/',
        start_url: '/monday/',
        icons: [
          {
            src: '/monday/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,svg,ico,json,webmanifest}'],
        runtimeCaching: [
          // Web-LLM bundles from unpkg — cache forever
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*\.js/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'web-llm-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // HuggingFace model files — cache for 7 days
          {
            urlPattern: /^https:\/\/huggingface\.co\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hf-models-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              networkTimeoutSeconds: 10,
            },
          },
          // Google Fonts — cache forever
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
          // API requests — network first, fallback to cache
          {
            urlPattern: /^https:\/\/.*api\.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        suppressWarnings: true,
        type: 'module',
      },
    }),
  ],
  base: '/monday/',
  build: {
    outDir: 'dist',
    target: 'esnext',
    chunkSizeWarningLimit: 8192,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@mlc-ai/web-llm')) return 'web-llm'
          if (id.includes('@xenova/transformers') || id.includes('onnxruntime-web')) return 'transformers'
          if (id.includes('pdfjs-dist')) return 'pdfjs'
          if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-') || id.includes('katex') || id.includes('highlight.js')) return 'markdown'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
          return undefined
        },
      },
    },
  },
})
