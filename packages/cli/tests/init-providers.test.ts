import { describe, expect, it } from 'vitest'
import {
  PROVIDER_DEFAULT_MODEL,
  PROVIDER_ENV_KEY,
  PROVIDER_IMPORT,
} from '../src/init-providers'

describe('init provider scaffolding metadata', () => {
  it('keeps every provider import, model, and environment mapping aligned', () => {
    for (const provider of ['deepseek', 'grok', 'kimi'] as const) {
      expect(PROVIDER_IMPORT[provider]).toBe(provider)
      expect(PROVIDER_DEFAULT_MODEL[provider]).toBeTruthy()
      expect(PROVIDER_ENV_KEY[provider]).toBeTruthy()
    }
  })

  it('keeps keyless providers explicit', () => {
    expect(PROVIDER_ENV_KEY.ollama).toBeNull()
    expect(PROVIDER_ENV_KEY.demo).toBeNull()
    expect(PROVIDER_DEFAULT_MODEL.ollama).toBe('llama3.1')
    expect(PROVIDER_DEFAULT_MODEL.demo).toBe('demo')
  })
})
