const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const STORAGE_KEY = 'monday-context'

function keyForSession(sessionId: string): string {
  return `${STORAGE_KEY}-${sessionId}`
}

interface ContextEntry {
  text: string
  timestamp: number
}

function getEntry(sessionId: string): ContextEntry | null {
  try {
    const raw = localStorage.getItem(keyForSession(sessionId))
    if (!raw) return null
    const entry: ContextEntry = JSON.parse(raw)
    if (Date.now() - entry.timestamp > EXPIRY_MS) {
      localStorage.removeItem(keyForSession(sessionId))
      return null
    }
    return entry
  } catch {
    return null
  }
}

export function getContext(sessionId: string): string {
  const entry = getEntry(sessionId)
  return entry?.text ?? ''
}

export function setContext(sessionId: string, text: string): void {
  const entry: ContextEntry = {
    text,
    timestamp: Date.now(),
  }
  try {
    localStorage.setItem(keyForSession(sessionId), JSON.stringify(entry))
  } catch {
    // Storage full — silently ignore
  }
}

export function clearContext(sessionId: string): void {
  localStorage.removeItem(keyForSession(sessionId))
}

export function hasContext(sessionId: string): boolean {
  const entry = getEntry(sessionId)
  return entry !== null && entry.text.length > 0
}
