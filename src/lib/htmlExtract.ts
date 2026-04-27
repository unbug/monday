/**
 * Extract HTML code blocks from markdown content and assemble them
 * into a single sandboxable HTML document.
 *
 * Supports:
 *   - ```html ... ```
 *   - ``` ... ``` (no language tag)
 *
 * Combines <style> and <script> blocks across multiple code fences
 * into a single <head>/<body> structure.
 */

export function extractHTMLCode(content: string): string | null {
  const blockRegex = /```(?:html|HTML)?\s*\n?([\s\S]*?)```/g
  let match
  const blocks: string[] = []

  while ((match = blockRegex.exec(content)) !== null) {
    blocks.push(match[1].trim())
  }

  if (blocks.length === 0) return null

  const styles = blocks
    .map((b) => {
      const styleMatch = b.match(/<style>([\s\S]*?)<\/style>/i)
      return styleMatch ? styleMatch[1] : null
    })
    .filter(Boolean)

  const scripts = blocks
    .map((b) => {
      const scriptMatch = b.match(/<script>([\s\S]*?)<\/script>/i)
      return scriptMatch ? scriptMatch[1] : null
    })
    .filter(Boolean)

  const bodies = blocks.filter((b) => !b.includes('<style') && !b.includes('<script'))

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    ...(styles.length > 0 ? [`<style>${styles.join('\n')}</style>`] : []),
    '</head>',
    '<body>',
    ...(bodies.length > 0 ? bodies : ['<div style="padding:16px;font-family:sans-serif;color:#333">No visual output — text-only generation.</div>']),
    '</body>',
    ...(scripts.length > 0 ? [`<script>${scripts.join('\n')}</script>`] : []),
    '</html>',
  ].join('\n')

  return html
}
