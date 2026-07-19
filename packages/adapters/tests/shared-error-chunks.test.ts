import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StreamChunk } from '@agentskit/core'
import { openai } from '../src/openai'

/**
 * ADR 0001 A3/A9 — shared createStreamSource error path:
 * HTTP failures and thrown fetch must end in exactly one error chunk with
 * `metadata.error instanceof Error`; never `done` and never reject.
 */
describe('shared error chunks (createStreamSource)', () => {
  let originalFetch: typeof globalThis.fetch
  beforeEach(() => {
    originalFetch = globalThis.fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const noRetry = { maxAttempts: 1, sleep: async () => {} }

  async function collect(factory: ReturnType<typeof openai>): Promise<StreamChunk[]> {
    const out: StreamChunk[] = []
    for await (const chunk of factory
      .createSource({
        messages: [
          {
            id: 'u1',
            role: 'user',
            content: 'hi',
            status: 'complete',
            createdAt: new Date(0),
          },
        ],
      })
      .stream()) {
      out.push(chunk)
    }
    return out
  }

  it('HTTP 500 ends in exactly one error chunk with metadata.error', async () => {
    globalThis.fetch = vi.fn(async () => new Response('upstream broke', { status: 500 })) as typeof globalThis.fetch

    let rejected: unknown
    let out: StreamChunk[] = []
    try {
      out = await collect(openai({ apiKey: 'k', model: 'gpt-4o-mini', retry: noRetry }))
    } catch (err) {
      rejected = err
    }

    expect(rejected).toBeUndefined()
    const terminals = out.filter(c => c.type === 'done' || c.type === 'error')
    expect(terminals).toHaveLength(1)
    expect(terminals[0]!.type).toBe('error')
    expect(terminals[0]!.metadata?.error).toBeInstanceOf(Error)
    expect(out.some(c => c.type === 'done')).toBe(false)
  })

  it('thrown fetch ends in exactly one error chunk with metadata.error', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as typeof globalThis.fetch

    let rejected: unknown
    let out: StreamChunk[] = []
    try {
      out = await collect(openai({ apiKey: 'k', model: 'gpt-4o-mini', retry: noRetry }))
    } catch (err) {
      rejected = err
    }

    expect(rejected).toBeUndefined()
    const terminals = out.filter(c => c.type === 'done' || c.type === 'error')
    expect(terminals).toHaveLength(1)
    expect(terminals[0]!.type).toBe('error')
    expect(terminals[0]!.metadata?.error).toBeInstanceOf(Error)
    expect((terminals[0]!.metadata?.error as Error).message).toMatch(/network down/)
    expect(out.some(c => c.type === 'done')).toBe(false)
  })
})
