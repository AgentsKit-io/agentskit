import { describe, expect, it } from 'vitest'
import { AgentsKitError } from '@agentskit/core'
import { buildTimeline, diffState, positionAt, type ReplayStep } from '../src/replay-timeline'

const step = (over: Partial<ReplayStep> & { id: string }): ReplayStep => ({
  nodeId: 'n',
  timestamp: 0,
  latencyMs: 0,
  tokensIn: 0,
  tokensOut: 0,
  costUsd: 0,
  state: {},
  outcome: 'ok',
  ...over,
})

describe('buildTimeline', () => {
  it('accumulates cost, tokens, and latency per row', () => {
    const tl = buildTimeline([
      step({ id: 's1', timestamp: 10, costUsd: 1, tokensIn: 2, tokensOut: 3, latencyMs: 100 }),
      step({ id: 's2', timestamp: 20, costUsd: 2, tokensIn: 1, tokensOut: 1, latencyMs: 50 }),
    ])
    expect(tl.rows[1]?.cumulativeCostUsd).toBe(3)
    expect(tl.rows[1]?.cumulativeTokens).toBe(7)
    expect(tl.rows[1]?.cumulativeLatencyMs).toBe(150)
    expect(tl.totalCostUsd).toBe(3)
    expect(tl.span).toEqual({ startedAt: 10, endedAt: 20 })
  })

  it('returns a zero-span timeline for empty input', () => {
    const tl = buildTimeline([])
    expect(tl.rows).toEqual([])
    expect(tl.span).toEqual({ startedAt: 0, endedAt: 0 })
  })
})

describe('diffState', () => {
  it('detects add / remove / change', () => {
    expect(diffState({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual([
      { kind: 'remove', key: 'a', previous: 1 },
      { kind: 'change', key: 'b', previous: 2, value: 3 },
      { kind: 'add', key: 'c', value: 4 },
    ])
  })
})

describe('positionAt', () => {
  const steps = [step({ id: 's1', state: { x: 1 } }), step({ id: 's2', state: { x: 2 } })]
  const tl = buildTimeline(steps)

  it('returns the cumulative row + diff from the previous checkpoint', () => {
    const pos = positionAt(steps, tl, 1)
    expect(pos.cumulative.stepId).toBe('s2')
    expect(pos.stateDiffFromPrevious).toEqual([{ kind: 'change', key: 'x', previous: 1, value: 2 }])
  })

  it('throws on an out-of-range index', () => {
    expect(() => positionAt(steps, tl, 5)).toThrow(AgentsKitError)
  })
})
