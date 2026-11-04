import { describe, expect, it } from 'vitest'
import { computeCallCost } from '../../src/catalog'

const usage = { promptTokens: 1_000_000, completionTokens: 500_000, totalTokens: 1_500_000 }

describe('computeCallCost', () => {
  it('prices tokens with the catalog table (USD per 1M tokens)', () => {
    const out = computeCallCost('openai', 'gpt-4o', usage)
    expect(out.usageReported).toBe(true)
    expect(out.inputTokens).toBe(1_000_000)
    expect(out.outputTokens).toBe(500_000)
    expect(out.priceSource).toBe('catalog')
    expect(out.costUsd).toBeGreaterThan(0)
  })

  it('config override wins over the catalog', () => {
    const out = computeCallCost('openai', 'gpt-4o', usage, {
      priceOverrides: { 'openai/gpt-4o': { input: 2, output: 4 } },
    })
    expect(out.priceSource).toBe('override')
    expect(out.costUsd).toBe(4)
  })

  it('marks a response without usage', () => {
    const out = computeCallCost('openai', 'gpt-4o', undefined)
    expect(out).toMatchObject({ usageReported: false, inputTokens: 0, outputTokens: 0, costUsd: undefined })
  })

  it('returns undefined cost for an unknown model but keeps tokens', () => {
    const out = computeCallCost('nope', 'nothing', usage)
    expect(out.priceSource).toBe('none')
    expect(out.costUsd).toBeUndefined()
    expect(out.inputTokens).toBe(1_000_000)
  })
})
