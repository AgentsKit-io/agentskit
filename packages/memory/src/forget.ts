import type { ChatMemory, VectorMemory } from '@agentskit/core'

/**
 * GDPR / LGPD / CCPA data-subject deletion. ADR-0003 deferred
 * retention; this module is the "forget the user" half.
 *
 * Design: rather than mutate every memory contract (and break the
 * public API freeze, RFC-0007), we attach `forgetSubject` as a
 * **capability** on a memory instance. Backends that can implement it
 * declare a `subjectFilter` (how to recognise records belonging to a
 * subject) and `deleteFn` (how to remove them). `forgetSubject(memory,
 * subjectId)` walks every backend the runtime is configured with and
 * runs the deletion, returning a per-backend report you can sign into
 * the audit log (#162).
 *
 * Closes issue #798.
 */

export interface ForgettableMemory {
  /**
   * Backend identifier (`'pgvector'`, `'pinecone'`, `'sqlite'`, etc.).
   * Used for the audit-log entry and for the per-backend report.
   */
  __agentskitBackend: string
  /** Delete every record where `metadata.subjectId === subjectId`. */
  forgetSubject: (subjectId: string) => Promise<ForgetReport>
}

/** Per-backend result returned by subject-data deletion. */
export interface ForgetReport {
  backend: string
  deletedCount: number
  /** ISO timestamp of the deletion. */
  at: string
  /** Records the deletion couldn't reach (offline replica, missing index). */
  failures?: Array<{ id: string; reason: string }>
}

/** Aggregate outcome of deleting a subject from multiple memory backends. */
export interface ForgetSubjectResult {
  subjectId: string
  reports: ForgetReport[]
  /** Inputs without the capability, which require an explicit out-of-band deletion. */
  skippedBackends: string[]
  incomplete: boolean
  totalDeleted: number
  /** Hash you can sign into the audit log to prove the deletion ran. */
  evidenceHash: string
}

function failedReport(backend: string, reason: string): ForgetReport {
  return {
    backend,
    deletedCount: 0,
    at: new Date().toISOString(),
    failures: [{ id: '*', reason }],
  }
}

function isForgettable(value: unknown): value is ForgettableMemory {
  return (
    !!value &&
    typeof value === 'object' &&
    'forgetSubject' in value &&
    typeof (value as ForgettableMemory).forgetSubject === 'function'
  )
}

async function hash(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Walk every memory passed in and run `forgetSubject(subjectId)` on
 * any that implement it. Missing capabilities are reported so callers
 * cannot mistake a partial deletion for a complete one.
 * @param memories Memory instances to inspect for deletion capability.
 * @param subjectId Subject identifier to delete.
 * @returns Per-backend reports and an `incomplete` flag for skipped or failed backends.
 */
export async function forgetSubject(
  memories: Array<ChatMemory | VectorMemory | unknown>,
  subjectId: string,
): Promise<ForgetSubjectResult> {
  const reports: ForgetReport[] = []
  const skippedBackends: string[] = []
  for (const memory of memories) {
    if (!isForgettable(memory)) {
      skippedBackends.push(typeof memory === 'object' && memory !== null && '__agentskitBackend' in memory
        ? String((memory as { __agentskitBackend?: unknown }).__agentskitBackend ?? 'unknown')
        : 'unknown')
      continue
    }
    try {
      reports.push(await memory.forgetSubject(subjectId))
    } catch (err) {
      reports.push(failedReport(memory.__agentskitBackend, err instanceof Error ? err.message : String(err)))
    }
  }
  const totalDeleted = reports.reduce((sum, r) => sum + r.deletedCount, 0)
  const evidenceHash = await hash(
    JSON.stringify({ subjectId, reports: reports.map(r => ({ b: r.backend, n: r.deletedCount, at: r.at })) }),
  )
  return {
    subjectId,
    reports,
    skippedBackends,
    incomplete: skippedBackends.length > 0 || reports.some(r => (r.failures?.length ?? 0) > 0),
    totalDeleted,
    evidenceHash,
  }
}

/**
 * Helper for backends that key records by `metadata.subjectId`. Wraps
 * any `delete(ids)`-style API into a `ForgettableMemory`.
 * @param memory Object to extend with the deletion capability.
 * @param options Backend label and functions for listing and deleting matching ids.
 * @returns The same object with `ForgettableMemory` methods and metadata.
 */
export function makeForgettable<M extends object>(
  memory: M,
  options: {
    backend: string
    listIds: (subjectId: string) => Promise<string[]>
    deleteIds: (ids: string[]) => Promise<void>
  },
): M & ForgettableMemory {
  return Object.assign(memory, {
    __agentskitBackend: options.backend,
    forgetSubject: async (subjectId: string): Promise<ForgetReport> => {
      const failures: Array<{ id: string; reason: string }> = []
      let ids: string[]
      try {
        ids = await options.listIds(subjectId)
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        return failedReport(options.backend, reason)
      }
      try {
        await options.deleteIds(ids)
      } catch (err) {
        for (const id of ids) failures.push({ id, reason: (err as Error).message })
      }
      return {
        backend: options.backend,
        deletedCount: ids.length - failures.length,
        at: new Date().toISOString(),
        failures: failures.length ? failures : undefined,
      }
    },
  } satisfies ForgettableMemory)
}
