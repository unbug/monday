import type { CustomPersona } from '../lib/prompts'

const CUSTOM_PERSONAS_KEY = 'monday-custom-personas'

export function getCustomPersonas(): CustomPersona[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PERSONAS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CustomPersona[]
  } catch {
    return []
  }
}

export function saveCustomPersona(persona: CustomPersona): void {
  const personas = getCustomPersonas()
  const idx = personas.findIndex((p) => p.id === persona.id)
  if (idx >= 0) {
    personas[idx] = persona
  } else {
    personas.push(persona)
  }
  localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas))
}

export function deleteCustomPersona(id: string): void {
  const personas = getCustomPersonas().filter((p) => p.id !== id)
  localStorage.setItem(CUSTOM_PERSONAS_KEY, JSON.stringify(personas))
}
