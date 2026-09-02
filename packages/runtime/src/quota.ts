import { ToolError, ErrorCodes, type ToolDefinition, type ToolExecutionContext } from '@agentskit/core'

/**
 * Per-tool quota / blast-radius limits. Beyond rate-limiting (#163),
 * agents need hard ceilings — "no matter what, this run cannot send
 * more than 50 emails" — so a runaway loop cannot dump 10k messages
 * or run a destructive query a thousand times.
 *
 * Two limits per tool:
 *
 *   - `perRun`     — counter resets on every `runtime.run()`.
 *   - `perWindow`  — sliding window (default 60s) shared across runs.
 *
 * Exceeding either raises a typed `ToolError` with code
 * `AK_TOOL_QUOTA_EXCEEDED` and emits a `tool:quota:exceeded` callback
 * so observers / cost-guards can react.
 *
 * Closes issue #801.
 */

export interface ToolQuota {
  /** Hard cap per `runtime.run()` invocation. */
  perRun?: number
  /** Sliding-window cap (count, window) shared across all runs. */
  perWindow?: { count: number; windowMs: number }
  /**
   * Mark the tool as "dry-run only" in production. When the env tag
   * is matched, the runtime throws before execute() is invoked.
   */
  dryRunRequiredIn?: string[]
}

export type QuotaMap = Record<string, ToolQuota>

export interface QuotaExceededEvent {
  tool: string
  /** Which limit fired. */
  kind: 'perRun' | 'perWindow' | 'dryRun'
  /** The configured limit (count). */
  limit: number
  /** What we observed (count). */
  observed: number
  /** ISO timestamp. */
  at: string
}

export interface QuotaTrackerOptions {
  quotas: QuotaMap
  /** Active environment tag (`'production'`, `'staging'`, …). */
  env?: string
  /** Sink for quota events. */
  onExceeded?: (event: QuotaExceededEvent) => void
  /** Wall clock — overridable for tests. */
  now?: () => number
}

export interface QuotaTracker {
  /** Throws and reserves one admission when the tool is over budget. */
  check: (tool: string, runId: string) => void
  /** Records a successful tool invocation against the counters. */
  record: (tool: string, runId: string) => void
  /** Releases an admission when tool execution fails before it completes. */
  release: (tool: string, runId: string) => void
  /** Reset per-run counters for a finished `runtime.run()`. */
  resetRun: (runId: string) => void
  /** Inspect counters (debugging / dashboards). */
  snapshot: () => QuotaSnapshot
}

export interface QuotaSnapshot {
  perRun: Record<string, Record<string, number>>
  perWindow: Record<string, number[]>
}

export function createQuotaTracker(options: QuotaTrackerOptions): QuotaTracker {
  const now = options.now ?? (() => Date.now())
  const perRun = new Map<string, Map<string, number>>()
  const perWindow = new Map<string, number[]>()
  const pending = new Map<string, Array<{ windowAt?: number }>>()

  const pendingKey = (tool: string, runId: string) => `${runId}\0${tool}`

  function trim(tool: string, windowMs: number): void {
    const cutoff = now() - windowMs
    const arr = perWindow.get(tool) ?? []
    while (arr.length > 0 && arr[0] < cutoff) arr.shift()
    perWindow.set(tool, arr)
  }

  return {
    check(tool, runId) {
      const quota = options.quotas[tool]
      if (!quota) return

      if (quota.dryRunRequiredIn && options.env && quota.dryRunRequiredIn.includes(options.env)) {
        const event: QuotaExceededEvent = {
          tool,
          kind: 'dryRun',
          limit: 0,
          observed: 1,
          at: new Date(now()).toISOString(),
        }
        options.onExceeded?.(event)
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_QUOTA_EXCEEDED,
          message: `Tool "${tool}" requires dry-run mode in env "${options.env}"`,
          hint: 'Run with `dryRun: true` or remove the dry-run-required env from quota config.',
        })
      }

      if (quota.perRun != null) {
        const runMap = perRun.get(runId) ?? new Map<string, number>()
        const current = runMap.get(tool) ?? 0
        const inFlight = pending.get(pendingKey(tool, runId))?.length ?? 0
        if (current + inFlight >= quota.perRun) {
          const event: QuotaExceededEvent = {
            tool,
            kind: 'perRun',
            limit: quota.perRun,
            observed: current + inFlight,
            at: new Date(now()).toISOString(),
          }
          options.onExceeded?.(event)
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_QUOTA_EXCEEDED,
            message: `Tool "${tool}" exceeded per-run quota (${current + inFlight}/${quota.perRun})`,
            hint: 'Lower the agent\'s steps, split the work across runs, or raise the quota.',
          })
        }
      }

      if (quota.perWindow) {
        trim(tool, quota.perWindow.windowMs)
        const arr = perWindow.get(tool) ?? []
        if (arr.length >= quota.perWindow.count) {
          const event: QuotaExceededEvent = {
            tool,
            kind: 'perWindow',
            limit: quota.perWindow.count,
            observed: arr.length,
            at: new Date(now()).toISOString(),
          }
          options.onExceeded?.(event)
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_QUOTA_EXCEEDED,
            message: `Tool "${tool}" exceeded sliding-window quota (${arr.length}/${quota.perWindow.count} per ${quota.perWindow.windowMs}ms)`,
          })
        }
      }

      const key = pendingKey(tool, runId)
      const reservations = pending.get(key) ?? []
      const reservation = quota.perWindow ? { windowAt: now() } : {}
      if (quota.perWindow) {
        const arr = perWindow.get(tool) ?? []
        arr.push(reservation.windowAt!)
        if (arr.length > 0 || perWindow.has(tool)) perWindow.set(tool, arr)
      }
      reservations.push(reservation)
      pending.set(key, reservations)
    },

    record(tool, runId) {
      const quota = options.quotas[tool]
      if (!quota) return

      const key = pendingKey(tool, runId)
      const reservations = pending.get(key)
      const reservation = reservations?.pop()
      if (reservations && reservations.length === 0) pending.delete(key)

      if (quota.perRun != null) {
        const runMap = perRun.get(runId) ?? new Map<string, number>()
        runMap.set(tool, (runMap.get(tool) ?? 0) + 1)
        perRun.set(runId, runMap)
      }
      if (quota.perWindow) {
        if (reservation?.windowAt == null) {
          const arr = perWindow.get(tool) ?? []
          arr.push(now())
          perWindow.set(tool, arr)
        }
      }
    },

    release(tool, runId) {
      const quota = options.quotas[tool]
      if (!quota) return

      const key = pendingKey(tool, runId)
      const reservations = pending.get(key)
      const reservation = reservations?.pop()
      if (!reservation) return
      if (reservations && reservations.length === 0) pending.delete(key)

      if (reservation.windowAt != null) {
        const arr = perWindow.get(tool) ?? []
        const index = arr.indexOf(reservation.windowAt)
        if (index >= 0) arr.splice(index, 1)
        perWindow.set(tool, arr)
      }
    },

    resetRun(runId) {
      perRun.delete(runId)
      for (const [key, reservations] of pending) {
        if (!key.startsWith(`${runId}\0`)) continue
        const tool = key.slice(runId.length + 1)
        const arr = perWindow.get(tool) ?? []
        for (const reservation of reservations) {
          if (reservation.windowAt == null) continue
          const index = arr.indexOf(reservation.windowAt)
          if (index >= 0) arr.splice(index, 1)
        }
        perWindow.set(tool, arr)
        pending.delete(key)
      }
    },

    snapshot() {
      const perRunOut: Record<string, Record<string, number>> = {}
      for (const [runId, m] of perRun) {
        perRunOut[runId] = Object.fromEntries(m)
      }
      const perWindowOut: Record<string, number[]> = {}
      for (const [tool, arr] of perWindow) {
        perWindowOut[tool] = [...arr]
      }
      return { perRun: perRunOut, perWindow: perWindowOut }
    },
  }
}

/**
 * Wrap a list of tools so every `execute` call is gated by the quota
 * tracker. Drop-in replacement for the raw tool array passed to
 * `createRuntime({ tools })`.
 */
export function withQuotas(
  tools: ToolDefinition[],
  tracker: QuotaTracker,
  runIdFor: (context: ToolExecutionContext) => string = ctx => ctx.runId ?? ctx.call.id,
): ToolDefinition[] {
  return tools.map(tool => {
    if (!tool.execute) return tool
    const original = tool.execute
    return {
      ...tool,
      execute: async (args, context) => {
        const runId = runIdFor(context)
        tracker.check(tool.name, runId)
        try {
          const result = await (original as (a: unknown, c: ToolExecutionContext) => unknown)(args, context)
          tracker.record(tool.name, runId)
          return result
        } catch (error) {
          tracker.release(tool.name, runId)
          throw error
        }
      },
    } as ToolDefinition
  })
}
