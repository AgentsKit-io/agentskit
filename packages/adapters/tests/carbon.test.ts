import { describe, expect, it } from 'vitest'
import { applyCarbonTable, estimateCO2Grams, DEFAULT_CARBON_TABLE } from '../src/carbon'
import type { RouterCandidate } from '../src/router'
import { createRouter } from '../src/router'

const fakeAdapter = {
  createSource: () => ({
    abort: () => {},
    stream: async function* () {
      yield { type: 'token' as const, content: 'x' }
    },
  }),
}

describe('applyCarbonTable', () => {
  it('looks up gCO2PerKtok by provider:region', () => {
    const out = applyCarbonTable([
      { id: 'openai-eu', adapter: fakeAdapter, region: 'swedencentral', cost: 0.6 },
      { id: 'anthropic-us', adapter: fakeAdapter, region: 'us-east-1', cost: 0.5 },
    ])
    expect(out[0]!.gCO2PerKtok).toBe(0.04)
    expect(out[1]!.gCO2PerKtok).toBe(0.42)
  })

  it('preserves explicit gCO2PerKtok', () => {
    const out = applyCarbonTable([{ id: 'x', adapter: fakeAdapter, region: 'us-east-1', gCO2PerKtok: 99 }])
    expect(out[0]!.gCO2PerKtok).toBe(99)
  })

  it('falls back when no entry is found', () => {
    const out = applyCarbonTable(
      [{ id: 'unknown', adapter: fakeAdapter, region: 'mars-1' as never }],
      { fallback: 0.5 },
    )
    expect(out[0]!.gCO2PerKtok).toBe(0.5)
  })
})

describe('estimateCO2Grams', () => {
  it('scales linearly with tokens', () => {
    expect(estimateCO2Grams(0.4, 2_000)).toBeCloseTo(0.8, 6)
  })

  it('returns 0 when no signal', () => {
    expect(estimateCO2Grams(undefined, 1_000)).toBe(0)
  })
})

describe('createRouter — carbon-aware policies', () => {
  const candidates: RouterCandidate[] = [
    { id: 'dirty-cheap', adapter: fakeAdapter, cost: 0.1, gCO2PerKtok: 1.0 },
    { id: 'clean-pricey', adapter: fakeAdapter, cost: 1.0, gCO2PerKtok: 0.05 },
    { id: 'mid', adapter: fakeAdapter, cost: 0.5, gCO2PerKtok: 0.3 },
  ]

  it('greenest picks lowest gCO2PerKtok', () => {
    let chosen = ''
    const router = createRouter({
      candidates,
      policy: 'greenest',
      onRoute: d => {
        chosen = d.id
      },
    })
    router.createSource({ messages: [] })
    expect(chosen).toBe('clean-pricey')
  })

  it('green-cost balances both signals', () => {
    let chosen = ''
    const router = createRouter({
      candidates,
      policy: 'green-cost',
      onRoute: d => {
        chosen = d.id
      },
    })
    router.createSource({ messages: [] })
    expect(chosen).toBe('mid')
  })
})

describe('DEFAULT_CARBON_TABLE', () => {
  it('has entries for the major providers', () => {
    expect(DEFAULT_CARBON_TABLE['openai:swedencentral']).toBeDefined()
    expect(DEFAULT_CARBON_TABLE['anthropic:us-east-1']).toBeDefined()
    expect(DEFAULT_CARBON_TABLE['google:europe-north1']).toBeDefined()
  })
})
