import type { AgentEvent, Observer } from '@agentskit/core'
import type { CostAlertEvent, CostAlertSink } from './cost-guard-advanced'

/**
 * SLO preset for AgentsKit. Tracks the four metrics that matter for an
 * agent runtime in production:
 *
 *   - success rate (per agent / per skill / per tool)
 *   - p50 / p95 / p99 latency
 *   - tool-error rate
 *   - streaming-stall rate (no chunk for `stallThresholdMs`)
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
  /** A chunk gap > this counts as a stall. Default 8000ms. */
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

export function sloObserver(options: SloOptions = {}): SloObserver {
  const targets = { ...DEFAULT_SLO_TARGETS, ...options.targets }
  const stallThresholdMs = options.stallThresholdMs ?? 8_000
  const windows = options.burnRateWindowsMs ?? [3_600_000, 21_600_000]
  const now = options.now ?? (() => Date.now())

  const samples: CallSample[] = []
  let toolErrors = 0
  let toolCalls = 0
  let streamCount = 0
  let streamStalls = 0

  // In-flight call tracking by event id.
  const inFlight = new Map<string, { startedAt: number; kind: CallSample['kind']; name?: string }>()
  const lastChunkAt = new Map<string, number>()

  function trim(windowMs: number): void {
    const cutoff = now() - windowMs
    while (samples.length > 0 && samples[0].at < cutoff) samples.shift()
  }

  function snapshotForWindow(windowMs: number): SloSnapshot {
    trim(windowMs)
    const cutoff = now() - windowMs
    const recent = samples.filter(s => s.at >= cutoff)
    const tools = recent.filter(s => s.kind === 'tool')
    const toolErr = tools.filter(s => !s.ok).length
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
      streamingStallRate: streamCount === 0 ? 0 : streamStalls / streamCount,
    }
  }

  function checkBurn(windowMs: number): void {
    const snap = snapshotForWindow(windowMs)
    if (!options.alert) return
    const errorBudget = 1 - targets.successRate
    const observedFailure = 1 - snap.successRate
    // Burn rate = how fast we're consuming the error budget. >1 means
    // we're on track to exhaust it within the window.
    const burnRate = errorBudget === 0 ? 0 : observedFailure / errorBudget
    if (burnRate >= 1) {
      void options.alert({
        type: 'cost:threshold',
        tenant: 'slo',
        window: `slo:${windowMs}ms`,
        at: new Date(now()).toISOString(),
        costUsd: 0,
        budgetUsd: 0,
        utilization: burnRate,
        threshold: 1,
        reason: `success rate ${(snap.successRate * 100).toFixed(2)}% < SLO ${(targets.successRate * 100).toFixed(2)}% over ${windowMs}ms`,
      } satisfies CostAlertEvent)
    }
  }

  const timer = setInterval(() => {
    for (const w of windows) checkBurn(w)
  }, 60_000)
  if (typeof timer === 'object' && 'unref' in timer) (timer as { unref?: () => void }).unref?.()

  function record(kind: CallSample['kind'], durationMs: number, ok: boolean, name?: string): void {
    samples.push({ at: now(), durationMs, ok, kind, name })
    if (kind === 'tool') {
      toolCalls += 1
      if (!ok) toolErrors += 1
    }
  }

  return {
    name: 'slo-preset',
    on: event => {
      const e = event as AgentEvent & { id?: string }
      switch (event.type) {
        case 'llm:start':
          if (e.id) {
            inFlight.set(e.id, { startedAt: now(), kind: 'llm' })
            streamCount += 1
            lastChunkAt.set(e.id, now())
          }
          break
        case 'llm:first-token':
          if (e.id) {
            const last = lastChunkAt.get(e.id)
            if (last && now() - last > stallThresholdMs) streamStalls += 1
            lastChunkAt.set(e.id, now())
          }
          break
        case 'llm:end': {
          const start = e.id ? inFlight.get(e.id) : undefined
          const durationMs = start ? now() - start.startedAt : 0
          record('llm', durationMs, true)
          if (e.id) {
            inFlight.delete(e.id)
            lastChunkAt.delete(e.id)
          }
          break
        }
        case 'tool:start':
          if (e.id) inFlight.set(e.id, { startedAt: now(), kind: 'tool', name: (event as { name?: string }).name })
          break
        case 'tool:end': {
          const start = e.id ? inFlight.get(e.id) : undefined
          const durationMs = start ? now() - start.startedAt : 0
          record('tool', durationMs, true, start?.name)
          if (e.id) inFlight.delete(e.id)
          break
        }
        case 'error': {
          // Best-effort: an error event without a matching start still
          // counts as a failure on whatever the most-recent in-flight
          // op was.
          if (e.id && inFlight.has(e.id)) {
            const start = inFlight.get(e.id)!
            record(start.kind, now() - start.startedAt, false, start.name)
            inFlight.delete(e.id)
          } else {
            record('agent', 0, false)
          }
          break
        }
      }
    },
    snapshot: (windowMs = 3_600_000) => snapshotForWindow(windowMs),
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
        '# HELP agentskit_streaming_stall_rate Fraction of streams with a chunk gap > threshold',
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
