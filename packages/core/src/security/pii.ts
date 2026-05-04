import type { Message } from '../types/message'

export interface PIIRule {
  name: string
  /** Pattern to match. Use global flag for full replacement. */
  pattern: RegExp
  /**
   * Replacement — either a literal string or a function that receives
   * the matched substring and returns the redacted value.
   */
  replacer?: string | ((match: string) => string)
}

export interface PIIRedactionMatch {
  offset: number
  length: number
}

export interface PIIRedactionHit {
  rule: string
  count: number
  matches: PIIRedactionMatch[]
}

export interface PIIRedactionResult<TPayload = string> {
  value: TPayload
  hits: PIIRedactionHit[]
}

export interface PIIRedactor {
  redact: (input: string) => PIIRedactionResult<string>
  redactMessages: (messages: Message[]) => PIIRedactionResult<Message[]>
}

/**
 * Default PII patterns — email, phone (US + E.164), SSN, IPv4, credit-card,
 * and RFC 4122 UUIDs. Every pattern is a reasonable baseline, none is
 * regulator-grade. For high-stakes use, layer a model-based classifier
 * or a commercial PII detector on top.
 */
export const DEFAULT_PII_RULES: PIIRule[] = [
  { name: 'email', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacer: '[REDACTED_EMAIL]' },
  {
    name: 'phone',
    pattern: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
    replacer: '[REDACTED_PHONE]',
  },
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacer: '[REDACTED_SSN]' },
  { name: 'ipv4', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacer: '[REDACTED_IP]' },
  {
    name: 'credit-card',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replacer: '[REDACTED_CC]',
  },
  {
    name: 'uuid',
    pattern: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
    replacer: '[REDACTED_UUID]',
  },
]

/**
 * Build a regex-based PII redactor. Every `redact` call returns both
 * the cleaned string and a per-rule hit count — plug into observability
 * so you can see *which* rules are firing without inspecting payloads.
 */
export function createPIIRedactor(options: { rules?: PIIRule[] } = {}): PIIRedactor {
  const rules = options.rules ?? DEFAULT_PII_RULES

  const redactString = (input: string): PIIRedactionResult<string> => {
    const hits: PIIRedactionHit[] = []
    let current = input
    for (const rule of rules) {
      let count = 0
      const matches: PIIRedactionMatch[] = []
      const replacer = rule.replacer ?? `[REDACTED_${rule.name.toUpperCase()}]`
      current = current.replace(rule.pattern, (match, ...args: unknown[]) => {
        count++
        const offset = args.find((arg): arg is number => typeof arg === 'number') ?? -1
        matches.push({ offset, length: match.length })
        return typeof replacer === 'function' ? replacer(match) : replacer
      })
      if (count > 0) hits.push({ rule: rule.name, count, matches })
    }
    return { value: current, hits }
  }

  return {
    redact: redactString,
    redactMessages(messages) {
      const hits = new Map<string, PIIRedactionHit>()
      const redacted = messages.map(m => {
        const { value, hits: msgHits } = redactString(m.content ?? '')
        for (const h of msgHits) {
          const current = hits.get(h.rule)
          if (!current) {
            hits.set(h.rule, { rule: h.rule, count: h.count, matches: [...h.matches] })
          } else {
            current.count += h.count
            current.matches.push(...h.matches)
          }
        }
        return { ...m, content: value }
      })
      return {
        value: redacted,
        hits: Array.from(hits.values()),
      }
    },
  }
}
