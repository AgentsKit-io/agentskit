import { describe, expect, it } from 'vitest'
import { applyOverrides } from '../../src/catalog'
import type { CatalogSnapshot } from '../../src/catalog'

const snapshot: CatalogSnapshot = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  source: { name: 'models.dev', url: 'https://models.dev/api.json', version: 'test' },
  providers: [
    {
      id: 'openai',
      name: 'OpenAI',
      env: ['OPENAI_API_KEY'],
      openaiCompatible: false,
      models: [
        { id: 'gpt-a', name: 'A', toolCall: true, structuredOutput: true, reasoning: false, attachment: false, openWeights: false },
        { id: 'gpt-b', name: 'B', toolCall: true, structuredOutput: true, reasoning: false, attachment: false, openWeights: false },
      ],
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      env: ['DEEPSEEK_API_KEY'],
      baseUrl: 'https://api.deepseek.com',
      openaiCompatible: true,
      models: [
        { id: 'chat', name: 'Chat', toolCall: true, structuredOutput: false, reasoning: false, attachment: false, openWeights: false },
      ],
    },
  ],
}

describe('applyOverrides', () => {
  it('does not mutate the input snapshot', () => {
    const before = JSON.stringify(snapshot)
    applyOverrides(snapshot, { disabledProviders: ['openai'] })
    expect(JSON.stringify(snapshot)).toBe(before)
  })

  it('disabledProviders removes a provider', () => {
    const out = applyOverrides(snapshot, { disabledProviders: ['openai'] })
    expect(out.providers.map((p) => p.id)).toEqual(['deepseek'])
  })

  it('allowedProviders keeps only listed providers', () => {
    const out = applyOverrides(snapshot, { allowedProviders: ['openai'] })
    expect(out.providers.map((p) => p.id)).toEqual(['openai'])
  })

  it('disabled takes precedence over allowed', () => {
    const out = applyOverrides(snapshot, {
      allowedProviders: ['openai', 'deepseek'],
      disabledProviders: ['openai'],
    })
    expect(out.providers.map((p) => p.id)).toEqual(['deepseek'])
  })

  it('allowedModels filters models per provider', () => {
    const out = applyOverrides(snapshot, { allowedModels: { openai: ['gpt-b'] } })
    expect(out.providers.find((p) => p.id === 'openai')?.models.map((m) => m.id)).toEqual(['gpt-b'])
    // provider without an allow-list entry keeps all models
    expect(out.providers.find((p) => p.id === 'deepseek')?.models).toHaveLength(1)
  })
})
