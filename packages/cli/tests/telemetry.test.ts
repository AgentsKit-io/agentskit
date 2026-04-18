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
})
