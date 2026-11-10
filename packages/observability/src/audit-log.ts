import { createHash, createHmac } from 'node:crypto'
import type { PIIRedactionHit } from '@agentskit/core/security'

/** Signed, sequence-numbered audit record linked to its predecessor. */
export interface AuditEntry<TPayload = unknown> {
  /** Monotonic sequence within a log. Starts at 1. */
  seq: number
  timestamp: string
  actor: string
  action: string
  payload: TPayload
  /** Hex SHA-256 of the previous entry's canonical form. '' for seq 1. */
  prevHash: string
  /** Hex HMAC of the canonical form of this entry (including prevHash). */
  signature: string
}

/** Append-only storage operations required by the signed audit log. */
export interface AuditLogStore {
  append: (entry: AuditEntry) => Promise<void>
  list: () => Promise<AuditEntry[]>
  last: () => Promise<AuditEntry | null>
  clear?: () => Promise<void>
}

/** Secret, storage, and clock settings for a signed audit log. */
export interface AuditLogOptions {
  /** HMAC secret — rotate out-of-band. */
  secret: string
  store: AuditLogStore
  /** Clock override for tests. */
  now?: () => Date
}

/** Caller-supplied values for one audit record. */
export interface AppendAuditInput<TPayload = unknown> {
  actor: string
  action: string
  payload: TPayload
}

/** Result of validating audit entry signatures and hash links. */
export interface AuditVerifyResult {
  ok: boolean
  /** First entry where the chain broke, or null when ok. */
  brokenAt?: { seq: number; reason: 'prev-hash' | 'signature' }
  entryCount: number
}

/** Operations exposed by a signed hash-chained audit log. */
export interface SignedAuditLog {
  append: <TPayload>(input: AppendAuditInput<TPayload>) => Promise<AuditEntry<TPayload>>
  verify: () => Promise<AuditVerifyResult>
  list: () => Promise<AuditEntry[]>
}

/** Audit action names emitted for PII redaction and reveal events. */
export type PiiAuditAction = 'pii:redact' | 'pii:reveal' | 'pii:reveal-denied'

/** PII scan details converted to signed audit records. */
export interface PiiAuditInput {
  actor: string
  action: PiiAuditAction
  subjectId?: string
  hits: readonly PIIRedactionHit[]
  reason?: string
}

/** PII match metadata stored in an audit record without matched text. */
export interface PiiAuditPayload {
  subjectId?: string
  rule: string
  count: number
  matches: Array<{ offset: number; length: number }>
  reason?: string
}

function canonical<TPayload>(entry: Omit<AuditEntry<TPayload>, 'signature'>): string {
  // Key order is stable — JSON.stringify on a hand-built object.
  return JSON.stringify({
    seq: entry.seq,
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    payload: entry.payload,
    prevHash: entry.prevHash,
  })
}

function hashCanonical(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Hash-chained + HMAC-signed audit log. Every entry references the
 * previous entry's hash, and every entry's body is signed with a
 * caller-supplied secret. Together: tamper-evident (chain detects
 * splicing) + authenticated (HMAC detects content edits by anyone
 * who doesn't hold the secret).
 *
 * Designed for SOC 2 / HIPAA friendly evidence. The `store` contract
 * is three methods so you can back the log with SQLite, S3 + GCS,
 * Postgres, or a read-only log service — anything append-only.
 */
export function createSignedAuditLog(options: AuditLogOptions): SignedAuditLog {
  const now = options.now ?? ((): Date => new Date())
  let appendTail = Promise.resolve()

  return {
    async append(input) {
      const operation = appendTail.then(async () => {
        const last = await options.store.last()
        const seq = (last?.seq ?? 0) + 1
        const prevHash = last ? hashCanonical(canonical(last)) : ''
        const body = canonical({
          seq,
          timestamp: now().toISOString(),
          actor: input.actor,
          action: input.action,
          payload: input.payload,
          prevHash,
        })
        const parsed = JSON.parse(body) as Omit<AuditEntry<typeof input.payload>, 'signature'>
        const entry: AuditEntry<typeof input.payload> = {
          ...parsed,
          signature: sign(body, options.secret),
        }
        await options.store.append(entry as AuditEntry<unknown>)
        return entry
      })
      appendTail = operation.then(() => undefined, () => undefined)
      return operation
    },

    async verify() {
      const entries = await options.store.list()
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!
        const expectedPrev = i === 0 ? '' : hashCanonical(canonical(entries[i - 1]!))
        if (entry.prevHash !== expectedPrev) {
          return { ok: false, brokenAt: { seq: entry.seq, reason: 'prev-hash' }, entryCount: entries.length }
        }
        const body = canonical(entry)
        if (entry.signature !== sign(body, options.secret)) {
          return { ok: false, brokenAt: { seq: entry.seq, reason: 'signature' }, entryCount: entries.length }
        }
      }
      return { ok: true, entryCount: entries.length }
    },

    async list() {
      return options.store.list()
    },
  }
}

/**
 * Append one audit record for each PII hit, storing offsets but no matched text.
 * @param log Signed audit log that receives the records.
 * @param input Actor, action, subject, hits, and optional reason to record.
 * @returns The appended records in hit order.
 */
export async function appendPiiAuditEvents(
  log: SignedAuditLog,
  input: PiiAuditInput,
): Promise<Array<AuditEntry<PiiAuditPayload>>> {
  const entries: Array<AuditEntry<PiiAuditPayload>> = []
  for (const hit of input.hits) {
    entries.push(
      await log.append<PiiAuditPayload>({
        actor: input.actor,
        action: input.action,
        payload: {
          subjectId: input.subjectId,
          rule: hit.rule,
          count: hit.count,
          matches: hit.matches.map(match => ({
            offset: match.offset,
            length: match.length,
          })),
          reason: input.reason,
        },
      }),
    )
  }
  return entries
}

/**
 * Create a transient in-memory audit store for tests, demos, or short-lived deployments.
 * @returns An empty store implementing the audit log storage contract.
 */
export function createInMemoryAuditStore(): AuditLogStore {
  const entries: AuditEntry[] = []
  return {
    async append(entry) {
      entries.push(entry)
    },
    async list() {
      return entries.slice()
    },
    async last() {
      return entries.length > 0 ? entries[entries.length - 1]! : null
    },
    async clear() {
      entries.length = 0
    },
  }
}
