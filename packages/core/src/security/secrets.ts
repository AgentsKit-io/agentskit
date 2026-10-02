const SECRET_PATTERNS = [
  /\b(?:sk|pk|xai|ghp|github_pat|AIza)[A-Za-z0-9_-]{10,}\b/gi,
  /\b(?:gh[pors]|github_pat)_[A-Za-z0-9_]{16,}\b/gi,
  /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
]

const SENSITIVE_ASSIGNMENT = /((?:["']?(?:access[-_]?token|refresh[-_]?token|client[-_]?secret|bot[-_]?token|[\w-]+[-_]token|token|api[-_]?key|secret|password|passwd|authorization|credential|private[-_]?key|signature)["']?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}]+)/gi
const SENSITIVE_KEY = /(?:^|_)(?:access_?token|refresh_?token|client_?secret|bot_?token|secret|password|passwd|api_?key|authorization|credential|private_?key|signature)(?:_|$)/
const MAX_DEPTH = 20

/**
 * Returns whether a field name indicates that its value is a secret.
 * @internal Used by package adapters that perform their own async traversal.
 * @since 1.13.0
 */
export function isSensitiveFieldName(key: string): boolean {
  const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase()
  if (normalizedKey.endsWith('_env')) return false
  return normalizedKey === 'token' || normalizedKey.endsWith('_token') || SENSITIVE_KEY.test(normalizedKey)
}

/**
 * Redacts common API keys, bearer credentials, private keys, and sensitive assignments.
 * @param value - Text that may contain credentials.
 * @param secrets - Additional literal credentials to remove.
 * @returns The redacted text.
 * @since 1.13.0
 */
export function redactSecrets(value: string, secrets: readonly string[] = []): string {
  let result = value
  for (const secret of [...secrets].filter(Boolean).sort((a, b) => b.length - a.length)) {
    result = result.split(secret).join('[REDACTED]')
  }
  result = result.replace(/(\/bot)[^/\s]+/gi, '$1[REDACTED]')
  result = result.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
  result = result.replace(/(\bauthorization\s*[:=]\s*)Bearer\s+\[REDACTED\]/gi, '$1[REDACTED]')
  for (const pattern of SECRET_PATTERNS) result = result.replace(pattern, '[REDACTED]')
  return result.replace(SENSITIVE_ASSIGNMENT, (match, prefix: string) => {
    const quote = match[prefix.length] === '"' || match[prefix.length] === "'" ? match[prefix.length]! : ''
    return `${prefix}${quote}[REDACTED]${quote}`
  })
}

/**
 * Redacts secret-looking strings and sensitive fields, replacing cycles and excess depth safely.
 * @param value - Value to redact.
 * @param secrets - Additional literal credentials to remove from strings.
 * @returns A redacted copy with cycles and deep nesting replaced by markers.
 * @since 1.13.0
 */
export function redactDeep(value: unknown, secrets: readonly string[] = []): unknown {
  const seen = new WeakSet<object>()
  const visit = (current: unknown, depth: number): unknown => {
    if (typeof current === 'string') return redactSecrets(current, secrets)
    if (current === null || typeof current !== 'object') return current
    if (depth >= MAX_DEPTH) return '[MaxDepth]'
    if (seen.has(current)) return '[Circular]'
    seen.add(current)
    try {
      if (Array.isArray(current)) return current.map(item => visit(item, depth + 1))
      return Object.fromEntries(Object.entries(current).map(([key, item]) => {
        return [key, isSensitiveFieldName(key) ? '[REDACTED]' : visit(item, depth + 1)]
      }))
    } finally {
      seen.delete(current)
    }
  }
  return visit(value, 0)
}
