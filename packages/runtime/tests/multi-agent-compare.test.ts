import { describe, expect, it } from 'vitest'
import { createCompareHandler, type AgentRunResult } from '../src/index'

type Ctx = { id: string }
const ctx: Ctx = { id: 'c1' }

const runAgent = (table: Record<string, AgentRunResult>) =>
  async (agentId: string): Promise<AgentRunResult> => {
    const r = table[agentId]
    if (!r) throw new Error(`no agent ${agentId}`)
    return r
  }

describe('createCompareHandler', () => {
  it('first/fastest picks the lowest-latency output', async () => {
    const handler = createCompareHandler<Ctx>({
      runAgent: runAgent({
        a: { output: 'slow', latencyMs: 100 },
        b: { output: 'fast', latencyMs: 10 },
      }),
    })
    const out = await handler({ agents: ['a', 'b'], selection: { mode: 'first', metric: 'fastest' } }, null, ctx)
    expect(out).toEqual({ kind: 'ok', value: 'fast' })
  })

  it('all/concat returns every output', async () => {
    const handler = createCompareHandler<Ctx>({
      runAgent: runAgent({ a: { output: 1 }, b: { output: 2 } }),
    })
    const out = await handler({ agents: ['a', 'b'], selection: { mode: 'all', combine: 'concat' } }, null, ctx)
    expect(out).toEqual({ kind: 'ok', value: [1, 2] })
  })

  it('judge selects the winner index', async () => {
    const handler = createCompareHandler<Ctx>({
      runAgent: runAgent({ a: { output: 'x' }, b: { output: 'y' } }),
      judger: async () => 1,
    })
    const out = await handler(
      { agents: ['a', 'b'], selection: { mode: 'judge', criteria: 'best', judgeAgent: 'j' } },
      null,
      ctx,
    )
    expect(out).toEqual({ kind: 'ok', value: 'y' })
  })

  it('manual selection pauses for HITL', async () => {
    const handler = createCompareHandler<Ctx>({ runAgent: runAgent({ a: { output: 1 } }) })
    const out = await handler({ agents: ['a'], selection: { mode: 'manual' } }, null, ctx)
    expect(out).toEqual({ kind: 'paused', reason: 'hitl' })
  })

  it('fails when every agent errors', async () => {
    const handler = createCompareHandler<Ctx>({ runAgent: async () => { throw new Error('x') } })
    const out = await handler({ agents: ['a'], selection: { mode: 'all', combine: 'concat' } }, null, ctx)
    expect(out.kind).toBe('failed')
  })
})
