import { describe, expect, it } from 'vitest'
import {
  computeCost,
  getPricing,
  registerPricing,
} from '../src/extensibility/telemetry'

describe('pricing + cost', () => {
  it('returns undefined for unknown models', () => {
    expect(getPricing('mystery-model-9')).toBeUndefined()
    expect(computeCost('mystery-model-9', { promptTokens: 1, completionTokens: 1 })).toBeUndefined()
  })

  it('matches provider-prefixed model names via suffix', () => {
    expect(getPricing('openai/gpt-4o')?.inputPerM).toBeGreaterThan(0)
  })

  it('prices from the models.dev catalog (no hardcoded table)', async () => {
    const { getCachedCost } = await import('@agentskit/adapters/catalog')
    const price = getCachedCost('openai', 'gpt-4o')!
    const cost = computeCost('gpt-4o', { promptTokens: 1200, completionTokens: 300 })!
    expect(cost.totalUsd).toBe((1200 * price.input! + 300 * price.output!) / 1e6)
  })

  it('computes separate input and output USD', () => {
    const cost = computeCost('gpt-4o', { promptTokens: 1_000_000, completionTokens: 500_000 })
    expect(cost?.inputUsd).toBeCloseTo(2.5, 4)
    expect(cost?.outputUsd).toBeCloseTo(5, 4)
    expect(cost?.totalUsd).toBeCloseTo(7.5, 4)
  })

  it('respects runtime-registered overrides', () => {
    registerPricing('custom-tiny', { inputPerM: 100, outputPerM: 200 })
    expect(
      computeCost('custom-tiny', { promptTokens: 1_000_000, completionTokens: 500_000 })?.totalUsd,
    ).toBeCloseTo(200, 4)
  })

  it('does not price bare ids missing from the catalog until registered', () => {
    const usage = { promptTokens: 1_000_000, completionTokens: 1_000_000 }
    expect(computeCost('claude-sonnet-4', usage)).toBeUndefined()
    registerPricing('claude-sonnet-4', { inputPerM: 3, outputPerM: 15 })
    expect(computeCost('claude-sonnet-4', usage)?.totalUsd).toBeCloseTo(18, 4)
  })
})
