import { describe, expect, it } from 'vitest'
import { buildSnapshot, normalizeModel } from './lib/models-dev-catalog.mjs'

describe('models.dev catalog normalization', () => {
  it('preserves lifecycle, limits, reasoning controls, and tiered costs', () => {
    const model = normalizeModel({
      id: 'model',
      name: 'Model',
      tool_call: true,
      reasoning: true,
      status: 'deprecated',
      reasoning_options: [{ type: 'effort', values: ['low', 'high'] }],
      limit: { context: 100, input: 80, output: 20 },
      cost: { input: 1, output: 2, tiers: [{ input: 3, output: 4, tier: { type: 'context', size: 200000 } }] },
    })
    expect(model.status).toBe('deprecated')
    expect(model.deprecated).toBe(true)
    expect(model.limit).toEqual({ context: 100, input: 80, output: 20 })
    expect(model.reasoningOptions).toEqual([{ type: 'effort', values: ['low', 'high'] }])
    expect(model.cost?.tiers?.[0].tier).toEqual({ type: 'context', size: 200000 })
  })

  it('produces deterministic provenance for a normalized payload', () => {
    const data = { provider: { id: 'provider', models: { model: { id: 'model' } } } }
    const first = buildSnapshot(data, { generatedAt: '2026-08-12T00:00:00.000Z' })
    const second = buildSnapshot(data, { generatedAt: '2026-08-12T00:00:00.000Z' })
    expect(first).toEqual(second)
    expect(first.source.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
