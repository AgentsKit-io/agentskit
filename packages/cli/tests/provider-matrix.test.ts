import { PROVIDER_REGISTRY } from '../src/provider-registry'
import { resolveChatProvider } from '../src/providers'
import { describe, expect, it } from 'vitest'

const cliEntries = PROVIDER_REGISTRY.filter(entry => entry.runtime === 'cli')

describe('CLI provider compatibility matrix', () => {
  it('has a resolver for every registry entry marked cli', () => {
    for (const entry of cliEntries) {
      const resolved = resolveChatProvider({
        provider: entry.id,
        apiKey: 'synthetic-test-key',
      })
      expect(resolved.provider).toBe(entry.id)
      expect(resolved.mode).toBe('live')
      expect(resolved.model).toBe(
        entry.defaultModel.status === 'known' ? entry.defaultModel.id : undefined,
      )
    }
  })

  it('creates every live source lazily without calling fetch', () => {
    const originalFetch = globalThis.fetch
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      throw new Error('network must not run during createSource')
    }) as typeof globalThis.fetch

    try {
      for (const entry of cliEntries) {
        const resolved = resolveChatProvider({
          provider: entry.id,
          apiKey: 'synthetic-test-key',
        })
        const source = resolved.adapter.createSource({
          messages: [{
            id: '1',
            role: 'user',
            content: 'hello',
            status: 'complete',
            createdAt: new Date(0),
          }],
        })
        expect(source.stream).toBeTypeOf('function')
        expect(source.abort).toBeTypeOf('function')
      }
      expect(calls).toBe(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
