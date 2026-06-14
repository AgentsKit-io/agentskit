import { describe, expect, it } from 'vitest'
import { createVoteHandler, type AgentRunResult } from '../src/index'

type Ctx = Record<string, never>
const ctx: Ctx = {}

const runAgent = (outputs: Record<string, unknown>) =>
  async (agentId: string): Promise<AgentRunResult> => ({ output: outputs[agentId] })

describe('createVoteHandler', () => {
  it('majority elects the plurality winner', async () => {
    const handler = createVoteHandler<Ctx>({
      runAgent: runAgent({ a: 'yes', b: 'yes', c: 'no' }),
    })
    const out = await handler({ agents: ['a', 'b', 'c'], ballot: { mode: 'majority' }, onTie: 'first' }, null, ctx)
    expect(out).toEqual({ kind: 'ok', value: 'yes' })
  })

  it('unanimous requires identical outputs, else ties', async () => {
    const handler = createVoteHandler<Ctx>({ runAgent: runAgent({ a: 'x', b: 'y' }) })
    const out = await handler({ agents: ['a', 'b'], ballot: { mode: 'unanimous' }, onTie: 'human' }, null, ctx)
    expect(out).toEqual({ kind: 'paused', reason: 'hitl' })
  })

  it('tie → first returns the first output', async () => {
    const handler = createVoteHandler<Ctx>({ runAgent: runAgent({ a: 'p', b: 'q' }) })
    const out = await handler({ agents: ['a', 'b'], ballot: { mode: 'majority' }, onTie: 'first' }, null, ctx)
    expect(out).toEqual({ kind: 'ok', value: 'p' })
  })

  it('quorum below threshold ties', async () => {
    const handler = createVoteHandler<Ctx>({ runAgent: runAgent({ a: 'a', b: 'b', c: 'c' }) })
    const out = await handler(
      { agents: ['a', 'b', 'c'], ballot: { mode: 'quorum', threshold: 0.5 }, onTie: 'human' },
      null,
      ctx,
    )
    expect(out.kind).toBe('paused')
  })
})
