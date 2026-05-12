/**
 * Credential redaction utility.
 *
 * Mirrors browser-use's fill() debug-log redaction practice:
 * sensitive values (API keys, passwords, tokens, secrets) are replaced
 * with [REDACTED] in audit trail logs.
 */

/**
 * Redact known credential patterns from a string.
 * Handles common patterns like API keys, passwords, tokens, and secrets.
 */
export function redactCredentials(input: string): string {
  if (!input) return input

  // Pattern 1: Values after common credential keys (case-insensitive)
  // Matches: "apiKey": "abc123", "password": "secret", "token": "xyz", "secret": "xxx"
  const credentialPattern = /("(?:apiKey|api_key|apikey|password|passwd|token|secret|secretKey|secret_key|auth|bearer|authorization|accessKey|access_key|privateKey|private_key)")\s*:\s*"([^"]+)"/gi
  let result = input.replace(credentialPattern, (_, key, value) => {
    // Only redact if the value looks like a credential (not empty, not a URL path)
    if (value.length > 0 && !value.startsWith('/') && !value.startsWith('#')) {
      return `${key}: "[REDACTED]"`
    }
    return `${key}: "${value}"`
  })

  // Pattern 2: Bearer token values in Authorization headers
  result = result.replace(
    /(Bearer\s)[A-Za-z0-9\-._~+\/]+=*/gi,
    '$1[REDACTED]',
  )

  // Pattern 3: Inline API key patterns (e.g., sk-..., pk_..., AKIA...)
  result = result.replace(
    /(sk-[A-Za-z0-9]{20,})/g,
    '[REDACTED]',
  )
  result = result.replace(
    /(pk_[A-Za-z0-9]{20,})/g,
    '[REDACTED]',
  )
  result = result.replace(
    /(AKIA[0-9A-Z]{16})/g,
    '[REDACTED]',
  )

  return result
}

/**
 * Redact credentials from a JSON object recursively.
 * Returns a new object with sensitive values replaced.
 */
export function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return redactCredentials(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(redactObject)
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      // Redact values for known credential keys regardless of content
      if (
        lowerKey === 'apiKey' ||
        lowerKey === 'api_key' ||
        lowerKey === 'apikey' ||
        lowerKey === 'password' ||
        lowerKey === 'passwd' ||
        lowerKey === 'token' ||
        lowerKey === 'secret' ||
        lowerKey === 'secretKey' ||
        lowerKey === 'secret_key' ||
        lowerKey === 'auth' ||
        lowerKey === 'bearer' ||
        lowerKey === 'authorization' ||
        lowerKey === 'accessKey' ||
        lowerKey === 'access_key' ||
        lowerKey === 'privateKey' ||
        lowerKey === 'private_key'
      ) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = redactObject(value)
      }
    }
    return result
  }
  return obj
}
