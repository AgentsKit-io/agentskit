import { ConfigError, ErrorCodes, type AgentEvent, type Observer } from '@agentskit/core'
import type { CostAlertEvent, CostAlertSink } from './cost-guard-advanced'

/**
 * SLO preset for AgentsKit. Tracks the four metrics that matter for an
 * agent runtime in production:
 *
 *   - success rate (per agent / per skill / per tool)
 *   - p50 / p95 / p99 latency
 *   - tool-error rate
 *   - streaming-stall rate (first-token latency above threshold)
 *
 * Operates on canonical AgentEvent only (no correlation id). In-flight
 * operations are tracked as a single active op under the sequential
 * event-stream assumption.
 *
 * Exposes Prometheus + OpenTelemetry-shaped snapshots and burn-rate
 * alerts (1h + 6h windows) that fire into the same alert sink contract
 * the cost guard already uses (`CostAlertSink`-compatible payloads).
 *
 * Closes issue #796.
 */

export interface SloTargets {
  /** 0–1. Default 0.99. */
  successRate?: number
  /** Milliseconds. Default 5000. */
  latencyP95Ms?: number
  /** 0–1. Default 0.01. */
  toolErrorRate?: number
  /** 0–1. Default 0.005. */
  streamingStallRate?: number
}

export interface SloOptions {
  targets?: SloTargets
  /** First-token latency above this counts as a stall. Default 8000ms. */
  stallThresholdMs?: number
  /** Burn-rate windows. Default `[3_600_000, 21_600_000]` (1h, 6h). */
  burnRateWindowsMs?: number[]
  /** Alert sink. Same contract as cost-guard alerts so a single sink can fan-in. */
  alert?: CostAlertSink
  /** Wall clock — overridable for tests. */
  now?: () => number
}

export const DEFAULT_SLO_TARGETS: Required<SloTargets> = {
  successRate: 0.99,
  latencyP95Ms: 5_000,
  toolErrorRate: 0.01,
  streamingStallRate: 0.005,
}

interface CallSample {
  at: number
  durationMs: number
  ok: boolean
  kind: 'llm' | 'tool' | 'agent'
  name?: string
  /** Present on llm samples: first-token latency exceeded stall threshold. */
  stall?: boolean
}

interface ActiveOp {
  kind: CallSample['kind']
  name?: string
  startedAt: number
  failed: boolean
  recorded: boolean
  stall: boolean
}

export interface SloSnapshot {
  windowMs: number
  total: number
  successRate: number
  latencyP50Ms: number
  latencyP95Ms: number
  latencyP99Ms: number
  toolErrorRate: number
  streamingStallRate: number
}

export interface SloObserver extends Observer {
  snapshot: (windowMs?: number) => SloSnapshot
  /** Prometheus exposition text (`# HELP / # TYPE / metric{...} value`). */
  prometheus: () => string
  /** OpenTelemetry-shaped metric records (push to OTLP). */
  otel: () => Array<{ name: string; value: number; attributes: Record<string, string> }>
  /** Stop the burn-rate timer. */
  stop: () => void
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length))
  return sorted[idx]
}

function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `sloObserver: ${name} must be a finite non-negative number (received ${String(value)})`,
      hint: 'Pass finite values ≥ 0 for intervals, thresholds, and rate targets.',
    })
  }
}

function assertUnitInterval(name: string, value: number): void {
  assertFiniteNonNegative(name, value)
  if (value > 1) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `sloObserver: ${name} must be between 0 and 1 (received ${String(value)})`,
      hint: 'Rate targets are fractions in [0, 1], e.g. 0.99 for 99%.',
    })
  }
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `sloObserver: ${name} must be a finite positive number (received ${String(value)})`,
      hint: 'Windows and thresholds must be > 0 to avoid NaN rates.',
    })
  }
}

function validateOptions(options: SloOptions): void {
  if (options.stallThresholdMs !== undefined) {
    assertPositive('stallThresholdMs', options.stallThresholdMs)
  }
  if (options.burnRateWindowsMs !== undefined) {
    if (options.burnRateWindowsMs.length === 0) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: 'sloObserver: burnRateWindowsMs must not be an empty array',
        hint: 'Omit burnRateWindowsMs for defaults, or pass one or more positive window lengths.',
      })
    }
    for (let i = 0; i < options.burnRateWindowsMs.length; i++) {
      assertPositive(`burnRateWindowsMs[${i}]`, options.burnRateWindowsMs[i]!)
    }
  }
  const t = options.targets
  if (!t) return
  if (t.successRate !== undefined) assertUnitInterval('targets.successRate', t.successRate)
  if (t.toolErrorRate !== undefined) assertUnitInterval('targets.toolErrorRate', t.toolErrorRate)
  if (t.streamingStallRate !== undefined) {
    assertUnitInterval('targets.streamingStallRate', t.streamingStallRate)
  }
  if (t.latencyP95Ms !== undefined) assertFiniteNonNegative('targets.latencyP95Ms', t.latencyP95Ms)
}

export function sloObserver(options: SloOptions = {}): SloObserver {
  validateOptions(options)

  const targets = { ...DEFAULT_SLO_TARGETS, ...options.targets }
  const stallThresholdMs = options.stallThresholdMs ?? 8_000
  const windows = options.burnRateWindowsMs ?? [3_600_000, 21_600_000]
  const now = options.now ?? (() => Date.now())

  const samples: CallSample[] = []
  let active: ActiveOp | null = null

  function trim(windowMs: number): void {
    const cutoff = now() - windowMs
    while (samples.length > 0 && samples[0]!.at < cutoff) samples.shift()
  }

  function snapshotForWindow(windowMs: number): SloSnapshot {
    trim(windowMs)
    const cutoff = now() - windowMs
    const recent = samples.filter(s => s.at >= cutoff)
    const tools = recent.filter(s => s.kind === 'tool')
    const toolErr = tools.filter(s => !s.ok).length
    const llm = recent.filter(s => s.kind === 'llm')
    const stalls = llm.filter(s => s.stall).length
    const ok = recent.filter(s => s.ok).length
    const sortedDurations = recent.map(s => s.durationMs).sort((a, b) => a - b)
    return {
      windowMs,
      total: recent.length,
      successRate: recent.length === 0 ? 1 : ok / recent.length,
      latencyP50Ms: quantile(sortedDurations, 0.5),
      latencyP95Ms: quantile(sortedDurations, 0.95),
      latencyP99Ms: quantile(sortedDurations, 0.99),
      toolErrorRate: tools.length === 0 ? 0 : toolErr / tools.length,
      streamingStallRate: llm.length === 0 ? 0 : stalls / llm.length,
    }
  }

  function fireAlert(event: CostAlertEvent): void {
    if (!options.alert) return
    try {
      const result = options.alert(event)
      // Isolate async rejections so the burn timer never surfaces unhandledRejection.
      if (result != null && typeof (result as Promise<void>).then === 'function') {
        void Promise.resolve(result).catch(() => {})
      }
    } catch {
      // Isolate synchronous throws from the burn-rate timer.
    }
  }

  function checkBurn(windowMs: number): void {
    const snap = snapshotForWindow(windowMs)
    if (!options.alert) return
    const errorBudget = 1 - targets.successRate
    const observedFailure = 1 - snap.successRate
    // Burn rate = how fast we're consuming the error budget. ≥1 means
    // we're on track to exhaust it within the window. A perfect success
    // target (errorBudget 0) treats any observed failure as fully burned.
    // Utilization stays finite so alert payloads remain JSON-serializable.
    const burnRate =
      errorBudget === 0
        ? observedFailure > 0
          ? 1
          : 0
        : observedFailure / errorBudget
    if (burnRate >= 1) {
      fireAlert({
        type: 'cost:threshold',
        tenant: 'slo',
        window: `slo:${windowMs}ms`,
        at: new Date(now()).toISOString(),
        costUsd: 0,
        budgetUsd: 0,
        utilization: burnRate,
        threshold: 1,
        reason: `success rate ${(snap.successRate * 100).toFixed(2)}% < SLO ${(targets.successRate * 100).toFixed(2)}% over ${windowMs}ms`,
      })
    }
  }

  const timer = setInterval(() => {
    for (const w of windows) checkBurn(w)
  }, 60_000)
  if (typeof timer === 'object' && 'unref' in timer) (timer as { unref?: () => void }).unref?.()

  function record(
    kind: CallSample['kind'],
    durationMs: number,
    ok: boolean,
    name?: string,
    stall?: boolean,
  ): void {
    samples.push({
      at: now(),
      durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0,
      ok,
      kind,
      name,
      stall,
    })
  }

  function failActive(): void {
    if (!active || active.recorded) return
    record(active.kind, now() - active.startedAt, false, active.name, active.stall || undefined)
    active.failed = true
    active.recorded = true
  }

  /** Record a previous incomplete op as failed before starting a replacement. */
  function replaceActive(next: ActiveOp): void {
    if (active && !active.recorded) failActive()
    active = next
  }

  function completeActive(
    kind: CallSample['kind'],
    durationMs: number,
    name?: string,
  ): void {
    if (active?.kind === kind) {
      if (!active.recorded) {
        record(kind, durationMs, !active.failed, active.name ?? name, active.stall || undefined)
      }
      active = null
      return
    }
    // End for a different kind (or no matching active): fail/clear the
    // previous incomplete op first so state never leaks into the next cycle.
    if (active && !active.recorded) {
      failActive()
    }
    active = null
    record(kind, durationMs, true, name)
  }

  return {
    name: 'slo-preset',
    on: (event: AgentEvent) => {
      switch (event.type) {
        case 'llm:start':
          replaceActive({
            kind: 'llm',
            startedAt: now(),
            failed: false,
            recorded: false,
            stall: false,
          })
          break
        case 'llm:first-token':
          if (active?.kind === 'llm' && event.latencyMs > stallThresholdMs) {
            active.stall = true
          }
          break
        case 'llm:end':
          completeActive('llm', event.durationMs)
          break
        case 'tool:start':
          replaceActive({
            kind: 'tool',
            name: event.name,
            startedAt: now(),
            failed: false,
            recorded: false,
            stall: false,
          })
          break
        case 'tool:end':
          completeActive('tool', event.durationMs, event.name)
          break
        case 'error':
          if (active) {
            failActive()
          } else {
            record('agent', 0, false)
          }
          break
        case 'run-aborted':
          failActive()
          active = null
          break
      }
    },
    snapshot: (windowMs = 3_600_000) => {
      assertPositive('windowMs', windowMs)
      return snapshotForWindow(windowMs)
    },
    prometheus: () => {
      const snap = snapshotForWindow(3_600_000)
      const lines = [
        '# HELP agentskit_success_rate Success rate over the last hour',
        '# TYPE agentskit_success_rate gauge',
        `agentskit_success_rate ${snap.successRate}`,
        '# HELP agentskit_latency_ms p50/p95/p99 latency over the last hour',
        '# TYPE agentskit_latency_ms gauge',
        `agentskit_latency_ms{quantile="0.5"} ${snap.latencyP50Ms}`,
        `agentskit_latency_ms{quantile="0.95"} ${snap.latencyP95Ms}`,
        `agentskit_latency_ms{quantile="0.99"} ${snap.latencyP99Ms}`,
        '# HELP agentskit_tool_error_rate Tool error rate over the last hour',
        '# TYPE agentskit_tool_error_rate gauge',
        `agentskit_tool_error_rate ${snap.toolErrorRate}`,
        '# HELP agentskit_streaming_stall_rate Fraction of streams with first-token latency > threshold',
        '# TYPE agentskit_streaming_stall_rate gauge',
        `agentskit_streaming_stall_rate ${snap.streamingStallRate}`,
      ]
      return lines.join('\n') + '\n'
    },
    otel: () => {
      const snap = snapshotForWindow(3_600_000)
      const w = String(snap.windowMs)
      const records: Array<{ name: string; value: number; attributes: Record<string, string> }> = [
        { name: 'agentskit.success_rate', value: snap.successRate, attributes: { window_ms: w } },
        { name: 'agentskit.latency_ms', value: snap.latencyP50Ms, attributes: { quantile: '0.5', window_ms: w } },
        { name: 'agentskit.latency_ms', value: snap.latencyP95Ms, attributes: { quantile: '0.95', window_ms: w } },
        { name: 'agentskit.latency_ms', value: snap.latencyP99Ms, attributes: { quantile: '0.99', window_ms: w } },
        { name: 'agentskit.tool_error_rate', value: snap.toolErrorRate, attributes: { window_ms: w } },
        { name: 'agentskit.streaming_stall_rate', value: snap.streamingStallRate, attributes: { window_ms: w } },
      ]
      return records
    },
    stop: () => clearInterval(timer),
  }
}
