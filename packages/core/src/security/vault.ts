import { randomBytes } from 'node:crypto'
import { ConfigError, ErrorCodes } from '../errors'
import type { PIIRule } from './pii'

/**
 * Reveal-by-role flow for PII that must be recoverable. Where the
 * default `createPIIRedactor` produces irreversible `[REDACTED_*]`
 * tags, `tokenize()` stores the original keyed by an opaque token in
 * a `RedactionVault`. `reveal()` looks the originals back up only
 * when an actor matches the configured `allowedRoles`.
 *
 * The vault contract is one interface with three methods so it can
 * be backed by anything append-only: in-memory (this module), KMS-
 * encrypted blob storage, HSM, etc. Originals never live on the write
 * path the agent / model can see.
 *
 * Closes the reveal-by-role half of issue #791.
 */

export interface RevealActor {
  /** Stable identity (email, OIDC subject, service-account name). */
  id: string
  /** Roles granted to this actor. Match against `allowedRoles` on reveal. */
  roles: string[]
}

export interface VaultEntry {
  /** ISO 8601 timestamp the value was tokenized. */
  storedAt: string
  /** Originally redacted text. */
  plaintext: string
  /** Roles permitted to reveal. Empty array means no actor can reveal. */
  allowedRoles: string[]
  /** Opaque metadata to help auditors correlate (request id, tenant id). */
  metadata?: Record<string, unknown>
}

export interface RedactionVault {
  put: (token: string, entry: VaultEntry) => Promise<void>
  /** Returns the entry with no role-check; reveal() does the check. */
  get: (token: string) => Promise<VaultEntry | null>
  delete?: (token: string) => Promise<void>
}

export interface RedactionAuditEvent {
  type: 'pii:redact' | 'pii:reveal' | 'pii:reveal-denied'
  /** ISO 8601 timestamp. */
  at: string
  /** Number of distinct tokens involved. */
  tokens: number
  /** Per-rule hit counts (only for redact events). */
  rules?: Array<{ rule: string; count: number }>
  /** Actor id for reveal events. */
  actor?: string
  /** Optional opaque correlation id. */
  context?: Record<string, unknown>
}

export type RedactionAuditSink = (event: RedactionAuditEvent) => void | Promise<void>

export interface TokenizeOptions {
  /**
   * Rules driving the match. Same shape as `PIIRedactor`'s rules; pass
   * `DEFAULT_PII_RULES` for the baseline set or `compilePIITaxonomy(...)`
   * for a custom JSON taxonomy.
   *
   * Tokenize walks the rules directly against the input rather than
   * post-processing a redactor's output — this keeps the algorithm
   * correct for adjacent matches, PII whose value collides with the
   * surrounding literal text, and custom replacers that don't emit
   * the bracketed `[REDACTED_*]` form.
   */
  rules: PIIRule[]
  vault: RedactionVault
  /** Roles allowed to reveal the originals. */
  allowedRoles: string[]
  /** Optional audit sink — receives one `pii:redact` event per call. */
  audit?: RedactionAuditSink
  /** Per-call correlation metadata threaded into both vault + audit. */
  context?: Record<string, unknown>
}

export interface RevealOptions {
  vault: RedactionVault
  actor: RevealActor
  /** Optional audit sink — receives `pii:reveal` or `pii:reveal-denied`. */
  audit?: RedactionAuditSink
  context?: Record<string, unknown>
}

const TOKEN_PATTERN = /<<piitoken:([a-f0-9]{32})>>/g

function newToken(): string {
  return `<<piitoken:${randomBytes(16).toString('hex')}>>`
}

interface SortedMatch {
  start: number
  end: number
  rule: string
}

/**
 * Replace every PII match in `input` with an opaque `<<piitoken:…>>`
 * marker, storing the original in the vault keyed by the marker.
 * Emits one `pii:redact` audit event per call.
 *
 * Walks the supplied rules against the input directly:
 *  1. collect every match with its [start, end) interval + rule name
 *  2. sort by start, drop overlaps (earlier rule wins)
 *  3. rebuild the output by interleaving literal slices with tokens
 *
 * Correct on adjacent matches, on PII whose value collides with the
 * surrounding literal text, and for custom replacers — the algorithm
 * never reads the redactor's substituted output.
 */
export async function tokenize(
  input: string,
  options: TokenizeOptions,
): Promise<{ value: string; tokens: string[] }> {
  if (!options.rules || !Array.isArray(options.rules)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'tokenize: rules array is required',
    })
  }
  if (!options.vault) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'tokenize: vault is required',
    })
  }

  // Collect intervals from every rule.
  const intervals: SortedMatch[] = []
  for (const rule of options.rules) {
    // Re-create the regex with a fresh lastIndex per call so multiple
    // tokenize() invocations on the same rules object don't see stale
    // state (matchAll handles this internally but we keep it explicit).
    const re = new RegExp(rule.pattern.source, rule.pattern.flags)
    for (const m of input.matchAll(re)) {
      const start = m.index ?? 0
      intervals.push({ start, end: start + m[0].length, rule: rule.name })
    }
  }

  // Sort by start, then by length (longer wins on tie). Drop any
  // interval that starts before the previous interval ended — earlier
  // (= higher-priority by rules order, then by start) wins.
  intervals.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  const kept: SortedMatch[] = []
  let last = -1
  for (const iv of intervals) {
    if (iv.start < last) continue
    kept.push(iv)
    last = iv.end
  }

  if (kept.length === 0) {
    await options.audit?.({
      type: 'pii:redact',
      at: new Date().toISOString(),
      tokens: 0,
      rules: [],
      context: options.context,
    })
    return { value: input, tokens: [] }
  }

  const tokens: string[] = []
  const ruleHits = new Map<string, number>()
  let out = ''
  let cursor = 0
  for (const iv of kept) {
    out += input.slice(cursor, iv.start)
    const original = input.slice(iv.start, iv.end)
    const token = newToken()
    tokens.push(token)
    await options.vault.put(token, {
      storedAt: new Date().toISOString(),
      plaintext: original,
      allowedRoles: [...options.allowedRoles],
      metadata: options.context,
    })
    out += token
    cursor = iv.end
    ruleHits.set(iv.rule, (ruleHits.get(iv.rule) ?? 0) + 1)
  }
  out += input.slice(cursor)

  await options.audit?.({
    type: 'pii:redact',
    at: new Date().toISOString(),
    tokens: tokens.length,
    rules: Array.from(ruleHits, ([rule, count]) => ({ rule, count })),
    context: options.context,
  })

  return { value: out, tokens }
}

/**
 * Replace every `<<piitoken:…>>` in `input` with the original from the
 * vault, but only for tokens whose `allowedRoles` overlap with the
 * actor's roles. Tokens the actor cannot reveal are left in place
 * unchanged. Emits at most one `pii:reveal` event (when something was
 * revealed) and at most one `pii:reveal-denied` (when something was
 * denied) per call.
 *
 * **Security note on deny counts.** The number of tokens that existed
 * in the vault but were not revealable by this actor is intentionally
 * *not* returned to the caller. Surfacing it back to the triggering
 * actor would let them probe arbitrary token IDs to learn which exist
 * in the vault (token-existence oracle). The count is delivered only
 * through the audit sink, which should be routed to operators rather
 * than back into the calling actor's response.
 */
export async function reveal(
  input: string,
  options: RevealOptions,
): Promise<{ value: string; revealed: number }> {
  if (!options.vault) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'reveal: vault is required',
    })
  }
  if (!options.actor || !Array.isArray(options.actor.roles)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'reveal: actor with roles[] is required',
    })
  }

  const actorRoles = new Set(options.actor.roles)
  let revealed = 0
  let denied = 0

  const matches = Array.from(input.matchAll(TOKEN_PATTERN))
  if (matches.length === 0) {
    return { value: input, revealed: 0 }
  }

  let out = ''
  let cursor = 0
  for (const match of matches) {
    const token = match[0]
    const start = match.index ?? 0
    out += input.slice(cursor, start)
    const entry = await options.vault.get(token)
    if (!entry) {
      out += token
      denied++
    } else {
      const allowed =
        entry.allowedRoles.length > 0 &&
        entry.allowedRoles.some(role => actorRoles.has(role))
      if (allowed) {
        out += entry.plaintext
        revealed++
      } else {
        out += token
        denied++
      }
    }
    cursor = start + token.length
  }
  out += input.slice(cursor)

  if (revealed > 0) {
    await options.audit?.({
      type: 'pii:reveal',
      at: new Date().toISOString(),
      tokens: revealed,
      actor: options.actor.id,
      context: options.context,
    })
  }
  if (denied > 0) {
    await options.audit?.({
      type: 'pii:reveal-denied',
      at: new Date().toISOString(),
      tokens: denied,
      actor: options.actor.id,
      context: options.context,
    })
  }

  return { value: out, revealed }
}

/**
 * Process-local in-memory vault. Suitable for tests and single-node
 * deployments. Production should back the vault with KMS-encrypted
 * blob storage so plaintext never lives unencrypted at rest.
 */
export function createInMemoryRedactionVault(): RedactionVault {
  const map = new Map<string, VaultEntry>()
  return {
    async put(token, entry) {
      map.set(token, entry)
    },
    async get(token) {
      return map.get(token) ?? null
    },
    async delete(token) {
      map.delete(token)
    },
  }
}
