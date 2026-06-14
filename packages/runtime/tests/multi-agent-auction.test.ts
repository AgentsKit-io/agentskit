import { describe, expect, it } from 'vitest'
import { createAuctionHandler, type AgentRunResult } from '../src/index'

type Ctx = Record<string, never>
const ctx: Ctx = {}

const runAgent = (table: Record<string, AgentRunResult>) =>
  async (agentId: string): Promise<AgentRunResult> => table[agentId] ?? { output: agentId }

describe('createAuctionHandler', () => {
  it('lowest-cost picks the cheapest bid', async () => {
    const handler = createAuctionHandler<Ctx>({
      runAgent: runAgent({
        a: { output: 'A', usd: 0.5 },
        b: { output: 'B', usd: 0.1 },
      }),
    })
    const out = await handler({ bidders: ['a', 'b'], bidCriteria: 'lowest-cost' }, null, ctx)
    expect(out).toMatchObject({ kind: 'ok', value: { winner: 'b', output: 'B', usedFallback: false } })
  })

  it('reserve price filters bids; fallback used when none qualify', async () => {
    const handler = createAuctionHandler<Ctx>({
      runAgent: runAgent({
        a: { output: 'A', usd: 5 },
        fb: { output: 'FB' },
      }),
    })
    const out = await handler(
      { bidders: ['a'], bidCriteria: 'lowest-cost', reservePrice: { usd: 1 }, fallback: 'fb' },
      null,
      ctx,
    )
    expect(out).toMatchObject({ kind: 'ok', value: { winner: 'fb', usedFallback: true } })
  })

  it('fails when no bid qualifies and no fallback is configured', async () => {
    const handler = createAuctionHandler<Ctx>({
      runAgent: runAgent({ a: { output: 'A', usd: 5 } }),
    })
    const out = await handler(
      { bidders: ['a'], bidCriteria: 'lowest-cost', reservePrice: { usd: 1 } },
      null,
      ctx,
    )
    expect(out.kind).toBe('failed')
  })

  it('custom scorer selects the highest score', async () => {
    const handler = createAuctionHandler<Ctx>({
      runAgent: runAgent({ a: { output: 'A' }, b: { output: 'B' } }),
      customScorer: (_bid, agentId) => (agentId === 'b' ? 10 : 1),
    })
    const out = await handler({ bidders: ['a', 'b'], bidCriteria: 'custom' }, null, ctx)
    expect(out).toMatchObject({ kind: 'ok', value: { winner: 'b' } })
  })
})
