import { afterEach, describe, expect, it } from 'vitest'
import { mergeWithConfig } from '../src/commands/shared'
import type { AgentsKitConfig } from '../src/config'

const ORIGINAL = process.env

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('mergeWithConfig', () => {
  it('returns options unchanged when config is undefined', () => {
    const opts = { provider: 'demo', model: 'foo' }
    expect(mergeWithConfig(opts, undefined)).toBe(opts)
  })

  it('replaces demo provider with config default', () => {
    const merged = mergeWithConfig(
      { provider: 'demo' },
      { defaults: { provider: 'openai' } } as AgentsKitConfig,
    )
    expect(merged.provider).toBe('openai')
  })

  it('keeps explicit provider over config', () => {
    const merged = mergeWithConfig(
      { provider: 'anthropic' },
      { defaults: { provider: 'openai' } } as AgentsKitConfig,
    )
    expect(merged.provider).toBe('anthropic')
  })

  it('falls back to model/baseUrl/tools/skill/system/memoryBackend defaults', () => {
    const merged = mergeWithConfig(
      { provider: 'demo' },
      {
        defaults: {
          provider: 'openai',
          model: 'gpt-4o',
          baseUrl: 'https://x',
          tools: 'web_search',
          skill: 'researcher',
          system: 'be terse',
          memoryBackend: 'sqlite',
        },
      } as AgentsKitConfig,
    )
    expect(merged.model).toBe('gpt-4o')
    expect(merged.baseUrl).toBe('https://x')
    expect(merged.tools).toBe('web_search')
    expect(merged.skill).toBe('researcher')
    expect(merged.system).toBe('be terse')
    expect(merged.memoryBackend).toBe('sqlite')
  })

  it('resolves apiKey via apiKeyEnv', () => {
    process.env.MY_KEY = 'secret-from-env'
    const merged = mergeWithConfig(
      { provider: 'openai' },
      { defaults: { apiKeyEnv: 'MY_KEY' } } as AgentsKitConfig,
    )
    expect(merged.apiKey).toBe('secret-from-env')
  })

  it('explicit options.apiKey wins over apiKeyEnv', () => {
    process.env.MY_KEY = 'env-value'
    const merged = mergeWithConfig(
      { provider: 'openai', apiKey: 'flag-value' },
      { defaults: { apiKeyEnv: 'MY_KEY', apiKey: 'literal' } } as AgentsKitConfig,
    )
    expect(merged.apiKey).toBe('flag-value')
  })

  it('falls through to literal apiKey when env missing and flag absent', () => {
    delete process.env.MY_KEY
    const merged = mergeWithConfig(
      { provider: 'openai' },
      { defaults: { apiKeyEnv: 'MY_KEY', apiKey: 'literal' } } as AgentsKitConfig,
    )
    expect(merged.apiKey).toBe('literal')
  })
})
