/**
 * Trace replay timeline + state-diff primitives.
 *
 * A replay UI scrubber lets the user select any checkpoint in a run and
 * inspect:
 *   1. Cumulative cost / latency / token counts up to that point.
 *   2. State delta between the previous and selected checkpoint.
 *
 * This module is pure — given a list of recorded steps it returns the
 * timeline rows + per-row state diff. The UI binds the rows to scrubber
 * positions; `replayBisect` drives re-execution from a chosen row.
 */

import { ErrorCodes, RuntimeError } from '@agentskit/core'

export type ReplayStep = {
  readonly id: string
  readonly nodeId: string
  readonly timestamp: number
  readonly latencyMs: number
  readonly tokensIn: number
  readonly tokensOut: number
  readonly costUsd: number
  readonly state: Readonly<Record<string, unknown>>
  readonly outcome: 'ok' | 'failed' | 'paused' | 'skipped'
}

export type TimelineRow = {
  readonly index: number
  readonly stepId: string
  readonly nodeId: string
  readonly timestamp: number
  readonly cumulativeCostUsd: number
  readonly cumulativeTokens: number
  readonly cumulativeLatencyMs: number
  readonly outcome: ReplayStep['outcome']
}

export type Timeline = {
  readonly rows: readonly TimelineRow[]
  readonly totalCostUsd: number
  readonly totalTokens: number
  readonly totalLatencyMs: number
  readonly span: { readonly startedAt: number; readonly endedAt: number }
}

export const buildTimeline = (steps: readonly ReplayStep[]): Timeline => {
  let cost = 0
  let tokens = 0
  let lat = 0
  const rows: TimelineRow[] = []
  for (let i = 0; i < steps.length; i += 1) {
    const s = steps[i] as ReplayStep
    cost += s.costUsd
    tokens += s.tokensIn + s.tokensOut
    lat += s.latencyMs
    rows.push({
      index: i,
      stepId: s.id,
      nodeId: s.nodeId,
      timestamp: s.timestamp,
      cumulativeCostUsd: cost,
      cumulativeTokens: tokens,
      cumulativeLatencyMs: lat,
      outcome: s.outcome,
    })
  }
  const startedAt = steps[0]?.timestamp ?? 0
  const endedAt = steps[steps.length - 1]?.timestamp ?? startedAt
  return {
    rows,
    totalCostUsd: cost,
    totalTokens: tokens,
    totalLatencyMs: lat,
    span: { startedAt, endedAt },
  }
}

export type StateDiffEntry =
  | { readonly kind: 'add'; readonly key: string; readonly value: unknown }
  | { readonly kind: 'remove'; readonly key: string; readonly previous: unknown }
  | { readonly kind: 'change'; readonly key: string; readonly previous: unknown; readonly value: unknown }

export const diffState = (
  previous: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>,
): readonly StateDiffEntry[] => {
  const entries: StateDiffEntry[] = []
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
  for (const k of keys) {
    const a = previous[k]
    const b = next[k]
    const inA = k in previous
    const inB = k in next
    if (!inA && inB) entries.push({ kind: 'add', key: k, value: b })
    else if (inA && !inB) entries.push({ kind: 'remove', key: k, previous: a })
    else if (!Object.is(a, b) && JSON.stringify(a) !== JSON.stringify(b)) {
      entries.push({ kind: 'change', key: k, previous: a, value: b })
    }
  }
  return entries
}

export type ReplayPosition = {
  readonly index: number
  readonly cumulative: TimelineRow
  readonly stateDiffFromPrevious: readonly StateDiffEntry[]
}

export const positionAt = (
  steps: readonly ReplayStep[],
  timeline: Timeline,
  index: number,
): ReplayPosition => {
  if (index < 0 || index >= timeline.rows.length) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: `replay index ${index} out of range [0, ${timeline.rows.length})`,
    })
  }
  const row = timeline.rows[index] as TimelineRow
  const current = (steps[index] as ReplayStep).state
  const prev = index === 0 ? {} : (steps[index - 1] as ReplayStep).state
  return {
    index,
    cumulative: row,
    stateDiffFromPrevious: diffState(prev, current),
  }
}
