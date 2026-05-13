/**
 * Built-in quick context templates — one-click context loaded into any session.
 * These are shipped with the app; users can "load" any template to create a
 * user snippet with a single click.
 */

export interface QuickContextTemplate {
  /** Unique template id (prefix: qctx_) */
  id: string
  /** Display title */
  title: string
  /** Short description shown on the card */
  description: string
  /** Snippet content (markdown) */
  content: string
  /** Category for the resulting snippet */
  category: 'code' | 'text' | 'template' | 'reference' | 'custom'
  /** Icon shown on the card */
  icon: string
  /** Whether this template ships with the app (vs. user-created) */
  builtin: true
}

export const QUICK_CONTEXT_TEMPLATES: QuickContextTemplate[] = [
  {
    id: 'qctx_project_readme',
    title: 'Project README',
    description: 'Standard project README template with sections for overview, setup, usage, and contributing.',
    content: `# Project Name

## Overview
Brief description of the project and its purpose.

## Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage
Describe how to use the project.

## Contributing
Guidelines for contributing.

## License
MIT`,
    category: 'template',
    icon: '📄',
    builtin: true,
  },
  {
    id: 'qctx_api_reference',
    title: 'API Reference',
    description: 'API endpoint reference template with method, path, params, and response format.',
    content: `# API Reference

## Endpoints

### GET /api/v1/resource
**Description**: Retrieve a list of resources.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |

**Response**:
\`\`\`json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
\`\`\`

### POST /api/v1/resource
**Description**: Create a new resource.

**Request Body**:
\`\`\`json
{
  "name": "string",
  "description": "string"
}
\`\`\`

**Response**: 201 Created
\`\`\`json
{
  "id": "uuid",
  "name": "string",
  "createdAt": "ISO-8601"
}
\`\`\``,
    category: 'reference',
    icon: '📚',
    builtin: true,
  },
  {
    id: 'qctx_coding_standards',
    title: 'Coding Standards',
    description: 'Team coding standards covering naming, structure, error handling, and testing.',
    content: `# Coding Standards

## Naming Conventions
- **Files**: \`camelCase\` for components, \`kebab-case\` for utilities
- **Components**: PascalCase (e.g. \`ChatInput\`)
- **Functions**: camelCase (e.g. \`sendMessage\`)
- **Constants**: UPPER_SNAKE_CASE (e.g. \`MAX_RETRIES\`)
- **Types/Interfaces**: PascalCase with no \`I\` prefix

## Structure
- One component per file
- Co-locate styles, tests, and stories
- \`index.ts\` barrel exports at package root
- Feature folders: \`features/<name>/\`

## Error Handling
- Use typed error classes, not bare strings
- \`try/catch\` at boundaries; propagate typed errors
- Never \`catch { }\` without logging

## TypeScript
- Strict mode enabled
- No \`any\` — use \`unknown\` when type is truly unknown
- Prefer \`type\` over \`interface\` for public APIs
- \`readonly\` for immutable data

## Testing
- Unit tests: \`*.test.ts\` alongside source
- Integration tests: \`tests/\` directory
- Coverage threshold: 80% line coverage

## Git
- Conventional Commits: \`feat:\`, \`fix:\`, \`chore:\`, \`docs:\`
- Branch naming: \`feat/<description>\`, \`fix/<description>\`
- PR requires 1 approval + CI green`,
    category: 'template',
    icon: '📋',
    builtin: true,
  },
  {
    id: 'qctx_commit_conventions',
    title: 'Commit Conventions',
    description: 'Conventional Commits guide for consistent git history.',
    content: `# Commit Message Convention

## Format
\`\`\`
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
\`\`\`

## Types
| Type | Description |
|------|-------------|
| \`feat\` | New feature |
| \`fix\` | Bug fix |
| \`docs\` | Documentation changes |
| \`style\` | Code style (formatting, semicolons, etc.) |
| \`refactor\` | Code refactoring |
| \`perf\` | Performance improvements |
| \`test\` | Adding or updating tests |
| \`chore\` | Build process or auxiliary tool changes |

## Rules
- Subject line: max 72 characters, imperative mood
- No period at the end of the subject
- Body: wrap at 72 characters
- Separate subject from body with a blank line
- Use the body to explain *what* and *why* vs. *how*

## Examples
\`\`\`
feat(chat): add image attachment support

Images can now be pasted or dropped into the chat input.
Vision-capable models will process attached images.

Closes #123
\`\`\`

\`\`\`
fix(storage): handle IndexedDB quota exceeded error

Add graceful fallback when storage quota is exceeded.

Fixes #456
\`\`\``,
    category: 'reference',
    icon: '🔖',
    builtin: true,
  },
  {
    id: 'qctx_pr_template',
    title: 'PR Template',
    description: 'Pull request template with description, changes, testing, and checklist.',
    content: `# Pull Request

## Description
<!-- Describe the changes in this PR -->

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix/feature that would cause existing functionality to change)
- [ ] Documentation update

## Changes
<!-- List your specific changes -->

## Testing
<!-- Describe how you tested your changes -->

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have added tests that prove my changes work
- [ ] I have updated documentation accordingly
- [ ] My changes generate no new warnings
- [ ] Any dependent changes are already merged`,
    category: 'template',
    icon: '📝',
    builtin: true,
  },
  {
    id: 'qctx_system_prompt',
    title: 'System Prompt',
    description: 'Generic system prompt template for AI assistant behavior.',
    content: `You are a helpful, precise, and concise AI assistant. Your core responsibilities:

1. **Accuracy first** — Provide correct, well-reasoned answers. Admit uncertainty when appropriate.
2. **Context-aware** — Adapt your response depth to the user's apparent expertise level.
3. **Structured output** — Use headings, lists, and code blocks to organize complex information.
4. **Actionable** — When possible, provide concrete next steps or code examples.
5. **Concise by default** — Be thorough but avoid unnecessary verbosity. Expand only when the user asks for detail.

## Communication style
- Use the user's language (match their input language)
- Prefer active voice and direct statements
- Use markdown formatting for clarity
- Code blocks must specify the language

## Limitations
- If you don't know something, say so rather than guessing
- If a request is ambiguous, ask for clarification
- Never fabricate facts, URLs, or code that won't work`,
    category: 'template',
    icon: '🤖',
    builtin: true,
  },
  {
    id: 'qctx_dockerfile',
    title: 'Dockerfile Template',
    description: 'Multi-stage Dockerfile template for Node.js applications.',
    content: `# Multi-stage Dockerfile for Node.js

# ── Build stage ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# ── Production stage ─────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]

# ── Docker Compose ───────────────────────────
# docker-compose.yml:
# services:
#   app:
#     build: .
#     ports:
#       - "3000:3000"
#     environment:
#       - NODE_ENV=production
#     restart: unless-stopped
#     healthcheck:
#       test: ["CMD", "wget", "--spider", "http://localhost:3000"]
#       interval: 30s
#       timeout: 10s
#       retries: 3`,
    category: 'code',
    icon: '🐳',
    builtin: true,
  },
  {
    id: 'qctx_gitignore',
    title: '.gitignore Template',
    description: 'Comprehensive .gitignore for Node.js/TypeScript projects.',
    content: `# Dependencies
node_modules/
.pnp/
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Misc
.cache/
tmp/
temp/

# MLC / WebLLM
mlc_cache/

# PWA
service-worker.js
workbox-*.js

# Local overrides
local.json`,
    category: 'code',
    icon: '🚫',
    builtin: true,
  },
]

/**
 * Load a template as a new user snippet.
 * Generates a unique ID and sets timestamps to now.
 */
export function templateToSnippet(template: QuickContextTemplate): Omit<import('../types').Snippet, 'id' | 'createdAt' | 'updatedAt'> & {
  id: string
  createdAt: number
  updatedAt: number
} {
  return {
    id: `snip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: template.title,
    content: template.content,
    category: template.category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
