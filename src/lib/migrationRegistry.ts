/**
 * Migration Registry — v1.0 stable schema governance.
 *
 * This file documents the frozen IndexedDB schema and establishes
 * rules for all future migrations. It is the single source of truth
 * for what stores exist, what data each holds, and how the schema
 * evolved.
 *
 * ## Schema Governance Rules
 *
 * 1. **Additive-only migrations.** Future migrations MUST only add
 *    new object stores or new fields on existing stores. They MUST NOT
 *    rename, remove, or change the type of any existing field.
 * 2. **New stores get their own store name constant.** Never reuse
 *    an existing store name.
 * 3. **Every migration gets a version bump.** DB_VERSION is the
 *   authoritative schema version.
 * 4. **Data migrations go in storage.ts.** The registry is
 *   documentation; actual migration logic stays in `openDB()`.
 * 5. **This file is the migration registry.** It lists every version
 *   transition and its purpose.
 */

// ── Frozen schema version ────────────────────────────────────────────────────
// This is the current DB_VERSION in storage.ts. DO NOT edit this constant
// without bumping DB_VERSION and adding a migration in storage.ts.
export const SCHEMA_VERSION = 22

// ── Object stores (frozen) ──────────────────────────────────────────────────
// The following stores are part of the frozen v1.0 schema. Future migrations
// MUST NOT remove or rename any of these stores.

export const SCHEMA_STORES = [
  {
    name: 'sessions',
    purpose: 'Chat sessions (title, messages, systemPrompt, provider, etc.)',
    keyPath: 'id',
    sinceVersion: 1,
  },
  {
    name: 'knowledge',
    purpose: 'Knowledge documents (PDF / TXT / MD uploads with chunks)',
    keyPath: 'id',
    sinceVersion: 1,
  },
  {
    name: 'vectorIndex',
    purpose: 'Knowledge document vector index for RAG search',
    keyPath: 'id',
    sinceVersion: 1,
  },
  {
    name: 'knowledgeBases',
    purpose: 'Knowledge base collections (named document groups)',
    keyPath: 'id',
    sinceVersion: 1,
  },
  {
    name: 'embeddings',
    purpose: 'Embedding vectors for RAG chunks (gte-small MLC)',
    keyPath: 'id',
    sinceVersion: 6,
  },
  {
    name: 'verdicts',
    purpose: 'Code Arena verdict votes (Team A / Tie / Team B)',
    keyPath: 'id',
    sinceVersion: 8,
  },
  {
    name: 'apiSettings',
    purpose: 'OpenAI-compatible API settings (baseUrl, apiKey, modelId)',
    keyPath: 'id',
    sinceVersion: 9,
  },
  {
    name: 'ollamaSettings',
    purpose: 'Ollama server settings (url, modelId)',
    keyPath: 'id',
    sinceVersion: 10,
  },
  {
    name: 'lmstudioSettings',
    purpose: 'LM Studio server settings (url, modelId)',
    keyPath: 'id',
    sinceVersion: 11,
  },
  {
    name: 'llamaCppSettings',
    purpose: 'llama.cpp server settings (url, modelId)',
    keyPath: 'id',
    sinceVersion: 12,
  },
  {
    name: 'vllmSettings',
    purpose: 'vLLM server settings (url, modelId)',
    keyPath: 'id',
    sinceVersion: 13,
  },
  {
    name: 'deepseekSettings',
    purpose: 'DeepSeek cloud API settings (baseUrl, apiKey, modelId)',
    keyPath: 'id',
    sinceVersion: 14,
  },
  {
    name: 'searxngSettings',
    purpose: 'SearXNG search instance settings (url)',
    keyPath: 'id',
    sinceVersion: 15,
  },
  {
    name: 'skills',
    purpose: 'User-defined skills (instructions, tags, required plugins)',
    keyPath: 'id',
    sinceVersion: 16,
  },
  {
    name: 'memories',
    purpose: 'Persistent cross-session memories (key-value store for v1.2)',
    keyPath: 'id',
    sinceVersion: 18,
  },
  {
    name: 'ontology',
    purpose: 'Typed entity graph (Person, Project, Task, Event, Document) for v1.2.2',
    keyPath: 'id',
    sinceVersion: 19,
  },
  {
    name: 'workshop',
    purpose: 'Skill Workshop proposals for v1.2.4 — user-reviewed skill improvement suggestions',
    keyPath: 'id',
    sinceVersion: 20,
  },
  {
    name: 'playwrightMcpSettings',
    purpose: 'Playwright MCP bridge settings (URL, domain allowlist, blocked origins) for v1.3.4',
    keyPath: 'id',
    sinceVersion: 21,
  },
  {
    name: 'taskBriefs',
    purpose: 'Per-task markdown config for the agent loop (AGENTS.md / CLAUDE.md equivalent) for v1.3',
    keyPath: 'id',
    sinceVersion: 22,
  },
] as const

// ── Migration history ───────────────────────────────────────────────────────
// Every version transition is documented here. This is the migration registry.

export interface MigrationEntry {
  /** The DB version this migration introduces */
  version: number
  /** Short description of what changed */
  description: string
  /** Which stores were added or modified */
  stores: string[]
}

export const MIGRATION_REGISTRY: MigrationEntry[] = [
  { version: 1, description: 'Initial schema — sessions, knowledge, vectorIndex, knowledgeBases stores', stores: ['sessions', 'knowledge', 'vectorIndex', 'knowledgeBases'] },
  { version: 6, description: 'Add embeddings store for RAG (v0.26)', stores: ['embeddings'] },
  { version: 8, description: 'Add verdicts store for Code Arena (v0.31.7)', stores: ['verdicts'] },
  { version: 9, description: 'Add apiSettings store + provider field on sessions (v1.0)', stores: ['apiSettings'] },
  { version: 10, description: 'Add ollamaSettings store (v1.0.1)', stores: ['ollamaSettings'] },
  { version: 11, description: 'Add lmstudioSettings store (v1.0.2)', stores: ['lmstudioSettings'] },
  { version: 12, description: 'Add llamaCppSettings store (v1.0.3)', stores: ['llamaCppSettings'] },
  { version: 13, description: 'Add vllmSettings store (v1.0.4)', stores: ['vllmSettings'] },
  { version: 14, description: 'Add deepseekSettings store (v1.0.5)', stores: ['deepseekSettings'] },
  { version: 15, description: 'Add searxngSettings store (v1.0.7)', stores: ['searxngSettings'] },
  { version: 16, description: 'Add skills store for v1.1 Skills System', stores: ['skills'] },
  { version: 17, description: 'Add skillIds field on sessions for v1.1 Skill composer', stores: ['sessions'] },
  { version: 18, description: 'Add memories store for v1.2 Persistent memory', stores: ['memories'] },
  { version: 19, description: 'Add ontology store for v1.2.2 Ontology store', stores: ['ontology'] },
  { version: 20, description: 'Add workshop proposals store for v1.2.4 Skill Workshop', stores: ['workshop'] },
  { version: 21, description: 'Add playwrightMcpSettings store for v1.3.4 Playwright MCP bridge', stores: ['playwrightMcpSettings'] },
  { version: 22, description: 'Add taskBriefs store for v1.3 Task brief', stores: ['taskBriefs'] },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the list of stores that were added in a given migration version.
 */
export function getStoresForMigration(version: number): string[] {
  const entry = MIGRATION_REGISTRY.find((m) => m.version === version)
  return entry ? entry.stores : []
}

/**
 * Returns the description of a migration by version.
 */
export function getMigrationDescription(version: number): string | undefined {
  const entry = MIGRATION_REGISTRY.find((m) => m.version === version)
  return entry?.description
}

/**
 * Returns the total number of stores in the frozen schema.
 */
export function getStoreCount(): number {
  return SCHEMA_STORES.length
}
