import { ConfigError, ErrorCodes, type AgentEvent, type Observer } from '@agentskit/core'

/**
 * Production agent control surface. Devtools (#35) is dev-only; this
 * is the auth-gated production counterpart that lets ops:
 *
 *   - pause an agent loop
 *   - step a paused loop one iteration
 *   - inject tool overrides for the next call to a tool
 *   - snapshot the current state for support tickets
 *   - replay from a previously-captured snapshot
 *
 * Designed as a transport-agnostic engine — the same `ControlSurface`
 * sits behind an HTTP endpoint, an MCP server, or in-process tests.
 * `httpHandler()` ships a bearer-token-gated REST surface so a
 * default deployment is one `createServer(handler)` call.
 *
 * Closes issue #784.
 */

export interface ToolOverride {
  /** Tool to override on the next call. */
  tool: string
  /**
   * Forced result. The runtime should return this verbatim instead
   * of running the tool's `execute()`. Single-shot — consumed by the
   * first matching tool call after injection.
   */
  result: string
  /** Optional: also mark the call status. Defaults to `'complete'`. */
  status?: 'complete' | 'error'
  /** Audit note included in the snapshot + audit log. */
  reason?: string
}

export interface RunSnapshot {
  runId: string
  /** ISO timestamp. */
  capturedAt: string
  paused: boolean
  /** Last seq number observed for the run. */
  seq: number
  /** Verbatim recent events for the run (capped). */
  events: AgentEvent[]
  /** Pending tool overrides. */
  overrides: ToolOverride[]
  /** Free-form metadata you want to ship with the support ticket. */
  metadata?: Record<string, unknown>
}

export interface ControlSurfaceOptions {
  /** Max events retained per run for snapshots. Default 200. */
  snapshotBufferSize?: number
  /**
   * Bearer token required for HTTP access. Required when using
   * `httpHandler()`. Compared with constant-time equality.
   */
  bearerToken?: string
  /** Audit log sink — gets every control action. */
  audit?: (entry: ControlAuditEntry) => void
}

export interface ControlAuditEntry {
  /** ISO timestamp. */
  at: string
  action: 'pause' | 'resume' | 'step' | 'inject' | 'snapshot' | 'replay'
  runId: string
  /** Authenticated principal id, if available. */
  actor?: string
  /** Action-specific payload (override details, snapshot id, etc). */
  payload?: Record<string, unknown>
}

export interface ControlSurface {
  /** Plug into `createRuntime({ observers: [control.observer] })`. */
  observer: Observer
  /** Pause the loop for `runId`. The runtime hook awaits a resume / step. */
  pause: (runId: string, actor?: string) => void
  resume: (runId: string, actor?: string) => void
  /** Allow exactly one more iteration on a paused run. */
  step: (runId: string, actor?: string) => void
  /** Inject a tool override consumed by the next matching tool call. */
  inject: (runId: string, override: ToolOverride, actor?: string) => void
  /** Capture a snapshot for a support ticket. */
  snapshot: (runId: string, metadata?: Record<string, unknown>) => RunSnapshot
  /** Restore a snapshot's pending overrides + paused state. Replay events are NOT reused — replay against your own runtime. */
  replay: (snapshot: RunSnapshot, actor?: string) => void
  /**
   * Hook the runtime calls between iterations. Resolves immediately
   * when the run is not paused; otherwise waits for `resume` /
   * `step`.
   */
  awaitResume: (runId: string) => Promise<void>
  /**
   * Hook the runtime calls before invoking a tool. Returns the
   * forced result if an override is queued; otherwise undefined and
   * the tool runs normally.
   */
  consumeOverride: (runId: string, tool: string) => ToolOverride | undefined
  /**
   * HTTP request handler — drop into any Node `http` / Express /
   * Hono route. Bearer-token gated.
   */
  httpHandler: () => (req: { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }) => Promise<{ status: number; body: unknown }>
}

interface RunState {
  paused: boolean
  pendingSteps: number
  resolvers: Array<() => void>
  overrides: ToolOverride[]
  events: AgentEvent[]
  seq: number
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

function eventRunId(event: AgentEvent): string | undefined {
  // Most agent events carry a `runId` in metadata. Fall back to a
  // top-level `id` for older sinks.
  const candidate = (event as { runId?: string; id?: string }).runId
  return candidate
}

export function createControlSurface(options: ControlSurfaceOptions = {}): ControlSurface {
  const bufferSize = Math.max(10, options.snapshotBufferSize ?? 200)
  const runs = new Map<string, RunState>()

  function ensureRun(runId: string): RunState {
    let state = runs.get(runId)
    if (!state) {
      state = { paused: false, pendingSteps: 0, resolvers: [], overrides: [], events: [], seq: 0 }
      runs.set(runId, state)
    }
    return state
  }

  function audit(entry: Omit<ControlAuditEntry, 'at'>): void {
    options.audit?.({ ...entry, at: new Date().toISOString() })
  }

  function flushOne(state: RunState): void {
    const next = state.resolvers.shift()
    if (next) next()
  }

  const surface: ControlSurface = {
    observer: {
      name: 'prod-control',
      on: event => {
        const runId = eventRunId(event)
        if (!runId) return
        const state = ensureRun(runId)
        state.seq += 1
        state.events.push(event)
        while (state.events.length > bufferSize) state.events.shift()
      },
    },

    pause(runId, actor) {
      ensureRun(runId).paused = true
      audit({ action: 'pause', runId, actor })
    },

    resume(runId, actor) {
      const state = ensureRun(runId)
      state.paused = false
      const queued = state.resolvers.splice(0, state.resolvers.length)
      for (const r of queued) r()
      audit({ action: 'resume', runId, actor })
    },

    step(runId, actor) {
      const state = ensureRun(runId)
      state.pendingSteps += 1
      flushOne(state)
      audit({ action: 'step', runId, actor })
    },

    inject(runId, override, actor) {
      ensureRun(runId).overrides.push(override)
      audit({ action: 'inject', runId, actor, payload: { tool: override.tool, reason: override.reason } })
    },

    snapshot(runId, metadata) {
      const state = ensureRun(runId)
      const snap: RunSnapshot = {
        runId,
        capturedAt: new Date().toISOString(),
        paused: state.paused,
        seq: state.seq,
        events: [...state.events],
        overrides: [...state.overrides],
        metadata,
      }
      audit({ action: 'snapshot', runId, payload: { seq: state.seq, eventCount: state.events.length } })
      return snap
    },

    replay(snap, actor) {
      const state = ensureRun(snap.runId)
      state.paused = snap.paused
      state.overrides = [...snap.overrides]
      audit({ action: 'replay', runId: snap.runId, actor, payload: { capturedAt: snap.capturedAt } })
    },

    async awaitResume(runId) {
      const state = ensureRun(runId)
      if (!state.paused) return
      if (state.pendingSteps > 0) {
        state.pendingSteps -= 1
        return
      }
      await new Promise<void>(resolve => {
        state.resolvers.push(resolve)
      })
    },

    consumeOverride(runId, tool) {
      const state = ensureRun(runId)
      const idx = state.overrides.findIndex(o => o.tool === tool)
      if (idx === -1) return undefined
      const [override] = state.overrides.splice(idx, 1)
      return override
    },

    httpHandler() {
      return async req => {
        if (!options.bearerToken) {
          throw new ConfigError({
            code: ErrorCodes.AK_CONFIG_INVALID,
            message: 'createControlSurface.httpHandler: bearerToken is required',
            hint: 'Set bearerToken in createControlSurface options. Use a unique token per environment.',
          })
        }
        const auth = req.headers['authorization']
        const headerValue = Array.isArray(auth) ? auth[0] : auth
        const presented = typeof headerValue === 'string' && headerValue.startsWith('Bearer ')
          ? headerValue.slice(7)
          : ''
        if (!constantTimeEqual(presented, options.bearerToken)) {
          return { status: 401, body: { error: 'unauthorized' } }
        }

        const url = new URL(req.url ?? '/', 'http://local')
        const parts = url.pathname.split('/').filter(Boolean)
        // /control/:action/:runId
        if (parts[0] !== 'control' || !parts[1]) {
          return { status: 404, body: { error: 'not_found' } }
        }
        const action = parts[1]
        const runId = parts[2] ?? ''
        const body = (req.body ?? {}) as Record<string, unknown>
        const actor = typeof body.actor === 'string' ? body.actor : undefined

        switch (action) {
          case 'pause':
            surface.pause(runId, actor)
            return { status: 200, body: { ok: true } }
          case 'resume':
            surface.resume(runId, actor)
            return { status: 200, body: { ok: true } }
          case 'step':
            surface.step(runId, actor)
            return { status: 200, body: { ok: true } }
          case 'inject': {
            const override = body.override as ToolOverride | undefined
            if (!override?.tool || typeof override.result !== 'string') {
              return { status: 400, body: { error: 'invalid_override' } }
            }
            surface.inject(runId, override, actor)
            return { status: 200, body: { ok: true } }
          }
          case 'snapshot':
            return { status: 200, body: surface.snapshot(runId, body.metadata as Record<string, unknown> | undefined) }
          case 'replay': {
            const snap = body.snapshot as RunSnapshot | undefined
            if (!snap?.runId) return { status: 400, body: { error: 'invalid_snapshot' } }
            surface.replay(snap, actor)
            return { status: 200, body: { ok: true } }
          }
          default:
            return { status: 404, body: { error: 'unknown_action' } }
        }
      }
    },
  }

  return surface
}
