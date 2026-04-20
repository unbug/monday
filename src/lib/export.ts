import type { ChatSession } from '../types'

function formatDate(date: number): string {
  return new Date(date).toISOString().split('T')[0]
}

function formatMessage(msg: { role: string; content: string; timestamp: number }): string {
  const roleLabel = msg.role === 'user' ? '👤 You' : '🤖 Assistant'
  const date = new Date(msg.timestamp).toLocaleString()
  return `### ${roleLabel}\n> _${date}_\n\n${msg.content}\n`
}

export function exportSessionAsMarkdown(session: ChatSession): string {
  const header = `# ${session.title}\n\n**Model:** ${session.modelId}\n**Created:** ${formatDate(session.createdAt)}\n**Updated:** ${formatDate(session.updatedAt)}\n\n---\n\n`
  const body = session.messages.map(formatMessage).join('---\n\n')
  return header + body
}

export function exportAllSessionsAsMarkdown(sessions: ChatSession[]): string {
  const header = `# Monday - All Conversations\n\n**Exported:** ${new Date().toISOString().split('T')[0]}\n**Total sessions:** ${sessions.length}\n\n---\n\n`

  const body = sessions
    .map((session) => {
      return `## ${session.title}\n\n**Model:** ${session.modelId}\n**Created:** ${formatDate(session.createdAt)}\n**Updated:** ${formatDate(session.updatedAt)}\n\n${session.messages.map(formatMessage).join('---\n\n')}\n\n---\n\n`
    })
    .join('')

  return header + body
}

export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadSession(session: ChatSession): void {
  const markdown = exportSessionAsMarkdown(session)
  downloadAsFile(markdown, `monday-export-${session.id}.md`)
}

export function downloadAll(sessions: ChatSession[]): void {
  const markdown = exportAllSessionsAsMarkdown(sessions)
  downloadAsFile(markdown, `monday-export-all.md`)
}
