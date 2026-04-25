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

const CHUNK_SIZE = 500 // tokens (approx chars)

/**
 * Split text into ~500-token chunks.
 * Splits on sentence boundaries when possible.
 */
export function chunkText(text: string): string[] {
  if (!text.trim()) return []
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > CHUNK_SIZE * 4) {
      if (current.trim()) chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
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
