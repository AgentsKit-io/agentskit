import { describe, expect, it } from 'vitest'
import {
  getModel,
  getProvider,
  listOpenAICompatibleProviders,
  listProviders,
} from '../../src/catalog'

describe('catalog loader', () => {
  it('looks up a known provider', () => {
    const openai = getProvider('openai')
    expect(openai?.name).toBe('OpenAI')
    expect(openai?.models.length).toBeGreaterThan(0)
  })

  it('returns undefined for unknown provider/model', () => {
    expect(getProvider('does-not-exist')).toBeUndefined()
    expect(getModel('openai', 'no-such-model')).toBeUndefined()
  })

  it('resolves a model within a provider', () => {
    const provider = getProvider('deepseek')
    const first = provider?.models[0]
    expect(first).toBeDefined()
    if (first) expect(getModel('deepseek', first.id)).toEqual(first)
  })

  it('openai-compatible subset is a subset of all providers', () => {
    const compat = listOpenAICompatibleProviders()
    expect(compat.length).toBeGreaterThan(0)
    expect(compat.length).toBeLessThanOrEqual(listProviders().length)
    expect(compat.every((p) => p.openaiCompatible)).toBe(true)
  })
})
