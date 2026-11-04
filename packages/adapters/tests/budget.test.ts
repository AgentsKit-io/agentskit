import { describe, expect, it } from 'vitest'
import { AdapterError, ConfigError } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { AK_BUDGET_EXCEEDED, BudgetExceededError, createBudgetLedger, estimateCostUsd, withBudget } from '../src/budget'

const price = { input: 1, output: 2 }

function req(overrides: Partial<AdapterRequest['context']> = {}, content = 'x'.repeat(400)): AdapterRequest {
  return {
    messages: [{ id: '1', role: 'user', content, status: 'complete', createdAt: new Date(0) }],
    context: { maxTokens: 1000, ...overrides },
  }
}

function spy(usage?: { promptTokens: number; completionTokens: number }) {
  let calls = 0
  const adapter: AdapterFactory = {
    createSource: () => {
      calls++
      return {
        abort: () => {},
        stream: async function* () {
          yield { type: 'text', content: 'hi' } as StreamChunk
          if (usage) yield { type: 'usage', usage: { ...usage, totalTokens: usage.promptTokens + usage.completionTokens } } as StreamChunk
          yield { type: 'done' } as StreamChunk
        },
      }
    },
  }
  return { adapter, calls: () => calls }
}

async function collect(adapter: AdapterFactory, request: AdapterRequest): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of adapter.createSource(request).stream()) out.push(chunk)
  return out
}

function refusal(chunks: StreamChunk[]): BudgetExceededError {
  expect(chunks).toHaveLength(1)
  expect(chunks[0]!.type).toBe('error')
  const error = chunks[0]!.metadata?.error
  expect(error).toBeInstanceOf(BudgetExceededError)
  return error as BudgetExceededError
}

describe('withBudget — per-call ceiling', () => {
  it('passes the call through when the estimate fits', async () => {
    const inner = spy()
    const chunks = await collect(withBudget(inner.adapter, { price, maxCallUsd: 1 }), req())
    expect(chunks.map(c => c.type)).toEqual(['text', 'done'])
    expect(inner.calls()).toBe(1)
  })

  it('refuses with a typed error before calling the model', async () => {
    const inner = spy()
    // ~102 prompt tokens * $1/M + 1000 output * $2/M ≈ $0.0021
    const error = refusal(await collect(withBudget(inner.adapter, { price, maxCallUsd: 0.001 }), req()))
    expect(inner.calls()).toBe(0)
    expect(error).toBeInstanceOf(AdapterError)
    expect(error.code).toBe(AK_BUDGET_EXCEEDED)
    expect(error.scope).toBe('call')
    expect(error.limitUsd).toBe(0.001)
    expect(error.estimatedUsd).toBeGreaterThan(0.002)
  })

  it('takes the ceiling from the call metadata over the default', async () => {
    const inner = spy()
    const adapter = withBudget(inner.adapter, { price, maxCallUsd: 1 })
    refusal(await collect(adapter, req({ metadata: { budget: { maxCallUsd: 0.0001 } } })))
    expect(inner.calls()).toBe(0)
  })

  it('uses maxOutputTokens when the request has no maxTokens', async () => {
    const inner = spy()
    const adapter = withBudget(inner.adapter, { price, maxCallUsd: 0.001, maxOutputTokens: 10_000 })
    refusal(await collect(adapter, req({ maxTokens: undefined })))
  })
})

describe('withBudget — named budget', () => {
  it('charges reported usage and refuses once the customer budget is spent', async () => {
    const ledger = createBudgetLedger({ limits: { 'customer:acme': 0.005 } })
    const inner = spy({ promptTokens: 1000, completionTokens: 1000 }) // $0.003 per call
    const adapter = withBudget(inner.adapter, { price, ledger, budget: 'customer:acme' })

    await collect(adapter, req())
    expect(ledger.spentUsd('customer:acme')).toBeCloseTo(0.003)

    const error = refusal(await collect(adapter, req()))
    expect(inner.calls()).toBe(1)
    expect(error.scope).toBe('budget')
    expect(error.budget).toBe('customer:acme')
    expect(error.limitUsd).toBe(0.005)
    expect(error.spentUsd).toBeCloseTo(0.003)
  })

  it('keeps budgets separate per name and resolves the name per request', async () => {
    const ledger = createBudgetLedger({ defaultLimitUsd: 0.001 })
    const inner = spy({ promptTokens: 500, completionTokens: 0 })
    const adapter = withBudget(inner.adapter, {
      price,
      ledger,
      budget: request => request.context?.metadata?.user as string | undefined,
    })
    await collect(adapter, req({ maxTokens: 0, metadata: { user: 'user:a' } }))
    await collect(adapter, req({ maxTokens: 0, metadata: { user: 'user:b' } }))
    expect(ledger.spentUsd('user:a')).toBeCloseTo(0.0005)
    expect(ledger.spentUsd('user:b')).toBeCloseTo(0.0005)
    expect(ledger.remainingUsd('user:a')).toBeCloseTo(0.0005)
    expect(inner.calls()).toBe(2)
  })

  it('accepts the budget name from call metadata', async () => {
    const ledger = createBudgetLedger({ limits: { 'customer:zero': 0 } })
    const inner = spy()
    const error = refusal(await collect(withBudget(inner.adapter, { price, ledger }), req({ metadata: { budget: 'customer:zero' } })))
    expect(error.budget).toBe('customer:zero')
    expect(inner.calls()).toBe(0)
  })

  it('reserves in-flight estimates so concurrent calls cannot overrun', async () => {
    const ledger = createBudgetLedger({ limits: { c: 0.003 } })
    const inner = spy({ promptTokens: 100, completionTokens: 100 })
    const adapter = withBudget(inner.adapter, { price, ledger, budget: 'c' })
    const a = adapter.createSource(req()).stream()
    await a.next() // first call reserved (~$0.0021) and streaming
    refusal(await collect(adapter, req()))
    for await (const _ of a) { /* drain */ }
    expect(ledger.spentUsd('c')).toBeCloseTo(estimateCostUsd(price, 100, 100))
  })

  it('charges the estimate when the provider reports no usage', async () => {
    const ledger = createBudgetLedger()
    const adapter = withBudget(spy().adapter, { price, ledger, budget: 'c' })
    await collect(adapter, req())
    expect(ledger.spentUsd('c')).toBeGreaterThan(0.002)
  })

  it('leaves unlisted names unmetered but tracked', async () => {
    const ledger = createBudgetLedger()
    const inner = spy({ promptTokens: 1_000_000, completionTokens: 0 })
    const adapter = withBudget(inner.adapter, { price, ledger, budget: 'free' })
    await collect(adapter, req())
    await collect(adapter, req())
    expect(inner.calls()).toBe(2)
    expect(ledger.spentUsd('free')).toBe(2)
    expect(ledger.remainingUsd('free')).toBeUndefined()
  })
})

describe('withBudget — configuration', () => {
  it('rejects a named budget without a ledger', () => {
    expect(() => withBudget(spy().adapter, { price, budget: 'c' })).toThrow(ConfigError)
  })

  it('rejects invalid prices and ceilings', () => {
    expect(() => withBudget(spy().adapter, { price: { input: -1, output: 0 } })).toThrow(ConfigError)
    expect(() => withBudget(spy().adapter, { price, maxCallUsd: Number.NaN })).toThrow(ConfigError)
    expect(() => createBudgetLedger({ limits: { a: -1 } })).toThrow(ConfigError)
  })

  it('does not touch the inner adapter in createSource', () => {
    const inner = spy()
    withBudget(inner.adapter, { price, maxCallUsd: 1 }).createSource(req())
    expect(inner.calls()).toBe(0)
  })
})
