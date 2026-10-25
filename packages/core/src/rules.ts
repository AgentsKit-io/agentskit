interface GuardrailRule {
  id: string
  pattern: RegExp
  message: string
  fix: string
}

/**
 * Static checks for security-sensitive identifiers and shared primitives.
 * @since 1.13.0
 */
export const CORE_RULES: readonly GuardrailRule[] = [
  {
    id: 'no-math-random-id',
    pattern: /Math\.random\(\)\.toString\(\s*36\s*\)|\b[\w$]*(?:id|identifier|token|nonce|key|path|filename|temp|tmp)[\w$]*\s*(?:=|:)\s*`[^`\n]*\$\{[^}]*Math\.random\s*\(\s*\)/i,
    message: 'Math.random identifiers are not collision-safe or unpredictable',
    fix: 'crypto.randomUUID() or createId() from @agentskit/core',
  },
  {
    id: 'no-raw-error-boundary',
    pattern: /throw\s+new\s+Error\s*\(/,
    message: 'Published package boundaries use typed AgentsKitError subclasses',
    fix: 'throw the package error subclass with an AK_* code',
  },
  {
    id: 'no-local-canonical-json',
    pattern: /function\s+(?:canonical|stable)(?:Json|Stringify)\s*\(/i,
    message: 'Canonical JSON must have one shared implementation',
    fix: 'canonicalJson() from @agentskit/core/hash',
  },
]
