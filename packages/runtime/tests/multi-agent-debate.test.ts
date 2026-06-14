import { describe, expect, it } from 'vitest'
import { createDebateHandler, type AgentRunResult } from '../src/index'

type Ctx = Record<string, never>
const ctx: Ctx = {}

describe('createDebateHandler', () => {
  it('runs N rounds then returns the judge verdict + transcript', async () => {
    const calls: string[] = []
    const handler = createDebateHandler<Ctx>({
      runAgent: async (agentId): Promise<AgentRunResult> => {
        calls.push(agentId)
        return { output: agentId === 'judge' ? 'pro-wins' : `${agentId}-says` }
      },
    })
    const out = await handler(
      { topic: 'tabs vs spaces', proponent: 'pro', opponent: 'opp', judge: 'judge', rounds: 2 },
      null,
      ctx,
    )
    // 2 rounds × (proponent + opponent) + 1 judge
    expect(calls).toEqual(['pro', 'opp', 'pro', 'opp', 'judge'])
    expect(out).toEqual({
      kind: 'ok',
      value: {
        verdict: 'pro-wins',
        transcript: [
          { role: 'proponent', content: 'pro-says' },
          { role: 'opponent', content: 'opp-says' },
          { role: 'proponent', content: 'pro-says' },
          { role: 'opponent', content: 'opp-says' },
        ],
      },
    })
  })

  it('early-exits on agreement', async () => {
    const calls: string[] = []
    const handler = createDebateHandler<Ctx>({
      runAgent: async (agentId): Promise<AgentRunResult> => {
        calls.push(agentId)
        return { output: agentId === 'judge' ? 'done' : 'agreed' }
      },
    })
    await handler(
      { topic: 't', proponent: 'pro', opponent: 'opp', judge: 'judge', rounds: 5, earlyExit: 'on-agreement' },
      null,
      ctx,
    )
    // round 1 proponent+opponent agree → break → judge. No round 2.
    expect(calls).toEqual(['pro', 'opp', 'judge'])
  })
})
