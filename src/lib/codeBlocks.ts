export interface CodeBlock {
  language: string
  code: string
  index: number
}

/**
 * Extract code blocks from markdown content.
 * Returns blocks with their index position in the content for reference.
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const regex = /```(\w+)?\n?([\s\S]*?)```/g
  let match
  let startIndex = 0

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2],
      index: match.index,
    })
  }

  return blocks
}

export function isJsLanguage(lang: string): boolean {
  return ['javascript', 'js', 'typescript', 'ts', 'node'].includes(lang.toLowerCase())
}

export function isPreviewable(lang: string): boolean {
  return ['html', 'svg', 'xml'].includes(lang.toLowerCase())
}
