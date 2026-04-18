/**
 * Human-in-the-loop primitives. A gate pauses agent execution at a
 * named decision point and records an `Approval` in a user-supplied
 * `ApprovalStore`. When a human (or another automation) writes a
 * decision, any waiter resumes with that decision.
 *
 * The store can be in-memory for tests, SQLite for single-node
 * deployments, or a shared DB / queue for multi-worker setups. Any
 * store that implements the 3-method contract works.
 */

export type ApprovalDecision = 'approved' | 'rejected'

export interface Approval<TPayload = unknown> {
  id: string
  /** Logical gate name (e.g. 'delete-user', 'send-email'). */
  name: string
  /** Caller-provided context for whoever reviews the approval. */
  payload: TPayload
  status: 'pending' | ApprovalDecision | 'cancelled'
  createdAt: string
  decidedAt?: string
  /** Free-form metadata the approver attached (reason, user id, etc.). */
  decisionMetadata?: Record<string, unknown>
}

export interface ApprovalStore {
  /** Persist a new pending approval. */
  put: <T>(approval: Approval<T>) => Promise<void>
  /** Read the current state of an approval. */
  get: <T>(id: string) => Promise<Approval<T> | null>
  /** Update status + metadata. */
  patch: <T>(id: string, update: Partial<Approval<T>>) => Promise<Approval<T> | null>
}

export interface RequestApprovalInput<TPayload> {
  /** Gate name (reuse across invocations — how approvers identify it). */
  name: string
  /** Context passed to reviewers. Safe to store — no secrets. */
  payload: TPayload
  /** Stable id for idempotent gating (e.g. tool call id). */
  id: string
}

export interface ApprovalGate<TPayload = unknown> {
  /**
   * Reserve or reuse an approval by id. First caller creates a
   * `pending` record. Subsequent calls return the existing record
   * — perfect for resuming a crashed run.
   */
  request: (input: RequestApprovalInput<TPayload>) => Promise<Approval<TPayload>>
  /**
   * Wait for `approved` or `rejected`. Resolves immediately if the
   * approval is already decided. Polls at `pollMs` (default 500ms)
   * up to `timeoutMs` (default Infinity).
   */
  await: (
    id: string,
    options?: { timeoutMs?: number; pollMs?: number; signal?: AbortSignal },
  ) => Promise<Approval<TPayload>>
  /** Approve, rejecting, or cancelling an approval. */
  decide: (
    id: string,
    decision: ApprovalDecision,
    metadata?: Record<string, unknown>,
  ) => Promise<Approval<TPayload>>
  cancel: (id: string) => Promise<Approval<TPayload>>
}

/**
 * Build an approval gate over any `ApprovalStore`. The core loop
 * couldn't be simpler — create-or-load + poll + patch — but having it
 * behind a stable contract lets you swap persistence without touching
 * agent code.
 */
export function createApprovalGate<TPayload = unknown>(
  store: ApprovalStore,
): ApprovalGate<TPayload> {
  return {
    async request({ id, name, payload }) {
      const existing = await store.get<TPayload>(id)
      if (existing) return existing
      const created: Approval<TPayload> = {
        id,
        name,
        payload,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      await store.put(created)
      return created
    },

    async await(id, options = {}) {
      const pollMs = Math.max(50, options.pollMs ?? 500)
      const deadline =
        options.timeoutMs !== undefined && options.timeoutMs !== Infinity
          ? Date.now() + options.timeoutMs
          : Infinity
      while (true) {
        if (options.signal?.aborted) throw new Error('await approval aborted')
        const current = await store.get<TPayload>(id)
        if (!current) throw new Error(`approval "${id}" not found`)
        if (current.status !== 'pending') return current
        if (Date.now() >= deadline) {
          throw new Error(`approval "${id}" timed out after ${options.timeoutMs}ms`)
        }
        await new Promise(r => setTimeout(r, pollMs))
      }
    },

    async decide(id, decision, metadata) {
      const updated = await store.patch<TPayload>(id, {
        status: decision,
        decidedAt: new Date().toISOString(),
        decisionMetadata: metadata,
      })
      if (!updated) throw new Error(`approval "${id}" not found`)
      return updated
    },

    async cancel(id) {
      const updated = await store.patch<TPayload>(id, {
        status: 'cancelled',
        decidedAt: new Date().toISOString(),
      })
      if (!updated) throw new Error(`approval "${id}" not found`)
      return updated
    },
  }
}

/** In-memory `ApprovalStore` — handy for tests and single-worker demos. */
export function createInMemoryApprovalStore(): ApprovalStore {
  const map = new Map<string, Approval<unknown>>()
  return {
    async put(approval) {
      map.set(approval.id, { ...approval })
    },
    async get<T>(id: string): Promise<Approval<T> | null> {
      const hit = map.get(id)
      return hit ? ({ ...(hit as Approval<T>) }) : null
    },
    async patch<T>(id: string, update: Partial<Approval<T>>): Promise<Approval<T> | null> {
      const hit = map.get(id)
      if (!hit) return null
      const next = { ...(hit as Approval<T>), ...update }
      map.set(id, next as Approval<unknown>)
      return next
    },
  }
}
