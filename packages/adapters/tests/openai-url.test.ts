import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { openai } from '../src/openai'
import { openrouter } from '../src/openrouter'
import { together } from '../src/together'
import type { AdapterFactory } from '@agentskit/core'

let originalFetch: typeof globalThis.fetch
beforeEach(() => {
  originalFetch = globalThis.fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

function captureUrl(): { url?: string } {
  const cap: { url?: string } = {}
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    cap.url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    throw new Error('stub')
  }) as typeof globalThis.fetch
  return cap
}

async function drain(factory: AdapterFactory): Promise<void> {
  const source = factory.createSource({
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
  })
  const iter = source.stream()[Symbol.asyncIterator]()
  try {
    while (!(await iter.next()).done) {
      /* drain */
    }
  } catch {
    /* expected stub throw */
  }
}

describe('openai-compatible endpoint URL', () => {
  it('canonical OpenAI (no /v1 in baseUrl) → single /v1', async () => {
    const cap = captureUrl()
    await drain(openai({ apiKey: 'k', model: 'gpt-4o' }))
    expect(cap.url).toBe('https://api.openai.com/v1/chat/completions')
  })

  it('baseUrl already ending in /v1 is not doubled', async () => {
    const cap = captureUrl()
    await drain(openai({ apiKey: 'k', model: 'm', baseUrl: 'https://example.test/v1' }))
    expect(cap.url).toBe('https://example.test/v1/chat/completions')
  })

  it('openrouter (/api/v1) → single /v1, not /api/v1/v1', async () => {
    const cap = captureUrl()
    await drain(openrouter({ apiKey: 'k', model: 'meta-llama/llama-3.3-70b-instruct:free' }))
    expect(cap.url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(cap.url).not.toContain('/v1/v1/')
  })

  it('together (/v1) → single /v1', async () => {
    const cap = captureUrl()
    await drain(together({ apiKey: 'k', model: 'x' }))
    expect(cap.url).not.toContain('/v1/v1/')
    expect(cap.url).toContain('/v1/chat/completions')
  })
})
