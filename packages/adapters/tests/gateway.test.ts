import { describe, expect, it } from 'vitest'
import type { AdapterFactory, StreamChunk } from '@agentskit/core'
import { createBudget, createGateway, GatewayCapError } from '../src/gateway'

const pricing = { input: 10, output: 30 } // USD per 1M tokens

function fake(promptTokens: number, completionTokens: number): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        yield { type: 'text', content: 'hi' } as StreamChunk
        yield {
          type: 'usage',
          usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
        } as StreamChunk
        yield { type: 'done' } as StreamChunk
      },
    }),
  }
}

async function run(a: AdapterFactory): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of a.createSource({ messages: [] }).stream()) out.push(c)
  return out
}

describe('createGateway', () => {
  it('returns tokens and estimated USD cost for each call', async () => {
    const calls: unknown[] = []
    const chunks = await run(createGateway({ adapter: fake(1000, 2000), pricing, onCall: (c) => calls.push(c) }))
    const usage = chunks.find((c) => c.type === 'usage')!
    expect(usage.usage).toEqual({ promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 })
    expect(usage.metadata?.costUsd).toBeCloseTo(0.07)
    expect(chunks.at(-1)?.metadata?.costUsd).toBeCloseTo(0.07)
    expect(calls).toHaveLength(1)
  })

  it('refuses a call over the per-call cap with a typed error', async () => {
    const gw = createGateway({ adapter: fake(1000, 2000), pricing, perCallCapUsd: 0.05 })
    const err = await run(gw).catch((e) => e)
    expect(err).toBeInstanceOf(GatewayCapError)
    expect(err).toMatchObject({ kind: 'per-call', code: 'AK_GATEWAY_CALL_CAP_EXCEEDED', limitUsd: 0.05 })
  })

  it('allows a call at or under the per-call cap', async () => {
    await expect(run(createGateway({ adapter: fake(1000, 2000), pricing, perCallCapUsd: 0.07 }))).resolves.toBeDefined()
  })

  it('refuses a call over a named budget with a typed error', async () => {
    const budget = createBudget('team-a', 0.1)
    const gw = createGateway({ adapter: fake(1000, 2000), pricing, budget })
    await run(gw) // 0.07 spent
    const err = await run(gw).catch((e) => e) // 0.14 > 0.1
    expect(err).toMatchObject({ kind: 'budget', code: 'AK_GATEWAY_BUDGET_EXCEEDED', budget: 'team-a' })
    expect(err).toBeInstanceOf(GatewayCapError)
    // exhausted budget refuses before any call
    const again = await run(gw).catch((e) => e)
    expect(again).toBeInstanceOf(GatewayCapError)
  })

  it('throws a config error when pricing is unknown', () => {
    expect(() => createGateway({ adapter: fake(1, 1), provider: 'nope', model: 'nope' })).toThrow(/pricing/)
  })
})
