/**
 * Document parser for Knowledge panel.
 * Handles PDF (via pdfjs-dist), TXT, and MD files.
 */

import * as pdfjs from 'pdfjs-dist'

// Configure pdfjs-dist worker
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs'

export interface ParsedDocument {
  name: string
  type: 'pdf' | 'txt' | 'md'
  content: string
  chunks: string[]
}

const CHUNK_SIZE = 500 // approximate token size

/**
 * Split text into ~500-token chunks with paragraph-aware quality.
 *
 * Strategy:
 * 1. Split on paragraph boundaries (double newline) first — best semantic unit
 * 2. If a paragraph exceeds CHUNK_SIZE, split on sentence boundaries
 * 3. If a sentence still exceeds CHUNK_SIZE, split on word boundaries
 * 4. Empty / whitespace-only text returns []
 */
export function chunkText(text: string): string[] {
  if (!text.trim()) return []

  const chunks: string[] = []
  let current = ''

  // Step 1: split on paragraph boundaries
  const paragraphs = text.split(/\n\s*\n/)

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    // If paragraph fits in current chunk, add it
    if (current && (current.length + 1 + trimmed.length) <= CHUNK_SIZE * 1.5) {
      current += '\n\n' + trimmed
      continue
    }

    // If paragraph is too long for a single chunk, split it
    if (trimmed.length > CHUNK_SIZE * 1.5) {
      // Flush current chunk first
      if (current.trim()) {
        chunks.push(current.trim())
        current = ''
      }
      // Split paragraph into smaller pieces
      const subChunks = splitLongText(trimmed, CHUNK_SIZE)
      for (const sub of subChunks) {
        chunks.push(sub)
      }
    } else {
      // Flush current chunk and start fresh with this paragraph
      if (current.trim()) {
        chunks.push(current.trim())
      }
      current = trimmed
    }
  }

  // Flush remaining
  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

/**
 * Split long text into chunks of approximately maxChars, respecting
 * sentence boundaries first, then word boundaries.
 */
function splitLongText(text: string, maxChars: number): string[] {
  const result: string[] = []

  // Try sentence boundaries first
  const sentences = text.match(/[^.!?\n]+[.!?]+[\s]*/g) || [text]
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars) {
      if (current.trim()) {
        result.push(current.trim())
        current = ''
      }
      // If single sentence exceeds maxChars, split on word boundaries
      if (sentence.length > maxChars) {
        const words = sentence.split(/\s+/)
        let wordChunk = ''
        for (const word of words) {
          if ((wordChunk + word).length > maxChars) {
            if (wordChunk.trim()) result.push(wordChunk.trim())
            wordChunk = word
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word
          }
        }
        if (wordChunk.trim()) current = wordChunk.trim()
      } else {
        current = sentence
      }
    } else {
      current += sentence
    }
  }

  if (current.trim()) {
    result.push(current.trim())
  }

  return result.length > 0 ? result : [text]
}

/**
 * Read a file as text.
 */
export function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Parse a PDF file into text using pdfjs-dist.
 */
export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = (content.items as Array<{ str?: string }>)
      .filter((item) => item.str)
      .map((item) => item.str!)
      .join(' ')
    pages.push(text)
  }

  return pages.join('\n\n')
}

/**
 * Parse a document file. Returns content and chunks.
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const type = file.type
  let text = ''
  let docType: 'pdf' | 'txt' | 'md' = 'txt'

  if (type === 'application/pdf' || file.name.endsWith('.pdf')) {
    docType = 'pdf'
    text = await parsePDF(file)
  } else if (type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
    docType = 'md'
    text = await readAsText(file)
  } else {
    docType = 'txt'
    text = await readAsText(file)
  }

  return {
    name: file.name,
    type: docType,
    content: text,
    chunks: chunkText(text),
  }
}
