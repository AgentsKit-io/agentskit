import { ConfigError, ErrorCodes } from '../errors'
import type { PIIRule } from './pii'

/**
 * JSON-friendly form of a PIIRule. Patterns become a string + flags so
 * the taxonomy can be loaded from a manifest file (or fetched from a
 * remote source) without `eval`.
 */
export interface PIITaxonomyEntry {
  name: string
  /** Regex source (the body, no slashes). */
  pattern: string
  /** Regex flags. Defaults to `g` if omitted. The `g` flag is required and added if missing. */
  flags?: string
  /** Literal replacement string. If omitted, defaults to `[REDACTED_<NAME>]`. */
  replacer?: string
  /** Optional human-readable description shown in lint reports / dashboards. */
  description?: string
}

export interface PIITaxonomy {
  /** Schema version. Must be `'1'`. */
  version: '1'
  /** Optional taxonomy id (e.g. `'us-baseline'`, `'br-lgpd'`) — purely informational. */
  id?: string
  rules: PIITaxonomyEntry[]
}

export interface TaxonomyValidationIssue {
  /** Rule index in the input array (-1 for top-level / shape errors). */
  index: number
  /** Field path (e.g. `'rules[3].pattern'`). */
  path: string
  message: string
}

export interface TaxonomyValidationResult {
  ok: boolean
  issues: TaxonomyValidationIssue[]
}

const NAME_RE = /^[a-z][a-z0-9_-]{0,63}$/
const KNOWN_RULE_FIELDS = new Set(['name', 'pattern', 'flags', 'replacer', 'description'])
const KNOWN_TOP_FIELDS = new Set(['version', 'id', 'rules'])

/** Adversarial input used to canary-check user-supplied regexes for catastrophic backtracking. */
const REDOS_CANARY = `${'a'.repeat(64)}!`
/** Match-time budget per rule, in milliseconds. Generous — well-formed regex finishes in well under 1 ms. */
const REDOS_BUDGET_MS = 25

/**
 * Pure-data validation. Does not throw — returns the full list of
 * issues so a CLI can present them all at once.
 */
export function validatePIITaxonomy(input: unknown): TaxonomyValidationResult {
  const issues: TaxonomyValidationIssue[] = []
  const push = (path: string, message: string, index = -1) => {
    issues.push({ index, path, message })
  }

  if (input === null || typeof input !== 'object') {
    push('', 'taxonomy must be an object')
    return { ok: false, issues }
  }

  const taxonomy = input as Record<string, unknown>

  for (const key of Object.keys(taxonomy)) {
    if (!KNOWN_TOP_FIELDS.has(key)) {
      push(key, `unknown top-level field "${key}"`)
    }
  }

  if (taxonomy.version !== '1') {
    push('version', `version must be "1" (got ${JSON.stringify(taxonomy.version)})`)
  }

  if (taxonomy.id !== undefined && typeof taxonomy.id !== 'string') {
    push('id', 'id must be a string when present')
  }

  if (!Array.isArray(taxonomy.rules)) {
    push('rules', 'rules must be an array')
    return { ok: false, issues }
  }

  const seenNames = new Set<string>()
  for (let i = 0; i < taxonomy.rules.length; i++) {
    const entry = taxonomy.rules[i]
    if (entry === null || typeof entry !== 'object') {
      push(`rules[${i}]`, 'rule must be an object', i)
      continue
    }
    const rule = entry as Record<string, unknown>

    if (typeof rule.name !== 'string' || !NAME_RE.test(rule.name)) {
      push(`rules[${i}].name`, `name must match /${NAME_RE.source}/`, i)
    } else if (seenNames.has(rule.name)) {
      push(`rules[${i}].name`, `duplicate name "${rule.name}"`, i)
    } else {
      seenNames.add(rule.name)
    }

    if (typeof rule.pattern !== 'string' || rule.pattern.length === 0) {
      push(`rules[${i}].pattern`, 'pattern must be a non-empty string', i)
    } else {
      let compiled: RegExp | undefined
      try {
        compiled = new RegExp(rule.pattern, typeof rule.flags === 'string' ? rule.flags : 'g')
      } catch (err) {
        push(`rules[${i}].pattern`, `invalid regex: ${(err as Error).message}`, i)
      }
      if (compiled !== undefined) {
        const start = performance.now()
        try {
          REDOS_CANARY.replace(compiled, '')
        } catch {
          // exec errors are unlikely on a successfully constructed regex; ignore.
        }
        const elapsed = performance.now() - start
        if (elapsed > REDOS_BUDGET_MS) {
          push(
            `rules[${i}].pattern`,
            `pattern took ${elapsed.toFixed(1)} ms on a ${REDOS_CANARY.length}-char canary (budget ${REDOS_BUDGET_MS} ms) — likely catastrophic backtracking; rewrite without nested quantifiers`,
            i,
          )
        }
      }
    }

    for (const key of Object.keys(rule)) {
      if (!KNOWN_RULE_FIELDS.has(key)) {
        push(`rules[${i}].${key}`, `unknown field "${key}"`, i)
      }
    }

    if (rule.flags !== undefined && typeof rule.flags !== 'string') {
      push(`rules[${i}].flags`, 'flags must be a string when present', i)
    }

    if (rule.replacer !== undefined && typeof rule.replacer !== 'string') {
      push(`rules[${i}].replacer`, 'replacer must be a string when present (use createPIIRedactor for function replacers)', i)
    }

    if (rule.description !== undefined && typeof rule.description !== 'string') {
      push(`rules[${i}].description`, 'description must be a string when present', i)
    }
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Compile a validated taxonomy into the runtime `PIIRule[]` shape used
 * by `createPIIRedactor`. Throws if the taxonomy fails validation —
 * call `validatePIITaxonomy` first if you want to surface every issue.
 */
export function compilePIITaxonomy(taxonomy: PIITaxonomy): PIIRule[] {
  const result = validatePIITaxonomy(taxonomy)
  if (!result.ok) {
    const summary = result.issues.map(i => `${i.path}: ${i.message}`).join('; ')
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `invalid PII taxonomy: ${summary}`,
      hint: 'Run `agentskit pii lint <file>` to surface every issue at once.',
    })
  }
  return taxonomy.rules.map(entry => {
    const flags = entry.flags ?? 'g'
    const finalFlags = flags.includes('g') ? flags : `${flags}g`
    return {
      name: entry.name,
      pattern: new RegExp(entry.pattern, finalFlags),
      replacer: entry.replacer ?? `[REDACTED_${entry.name.toUpperCase()}]`,
    }
  })
}

/** JSON Schema (Draft 7) for the taxonomy file — exported so tooling can publish it. */
export const PII_TAXONOMY_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://www.agentskit.io/schemas/pii-taxonomy/v1.json',
  title: 'AgentsKit PII Taxonomy',
  type: 'object',
  required: ['version', 'rules'],
  additionalProperties: false,
  properties: {
    version: { const: '1' },
    id: { type: 'string' },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'pattern'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', pattern: NAME_RE.source },
          pattern: { type: 'string', minLength: 1 },
          flags: { type: 'string' },
          replacer: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
} as const
