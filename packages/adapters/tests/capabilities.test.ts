import { describe, it, expect, vi } from 'vitest'
import type { StreamChunk } from '@agentskit/core'
import { openai, anthropic, gemini, ollama, mockAdapter, vercelAI } from '../src'
import { chunkText, simulateStream } from '../src/utils'

describe('adapter capabilities', () => {
  it('openai advertises streaming, tools, usage', () => {
    const adapter = openai({ apiKey: 'x', model: 'gpt-4o' })
    expect(adapter.capabilities?.streaming).toBe(true)
    expect(adapter.capabilities?.tools).toBe(true)
    expect(adapter.capabilities?.usage).toBe(true)
  })

  it('openai o1 advertises reasoning', () => {
    const adapter = openai({ apiKey: 'x', model: 'o1-preview' })
    expect(adapter.capabilities?.reasoning).toBe(true)
  })

  it('openai gpt-3.5 does not advertise reasoning', () => {
    const adapter = openai({ apiKey: 'x', model: 'gpt-3.5-turbo' })
    expect(adapter.capabilities?.reasoning).toBe(false)
  })

  it('anthropic advertises multi-modal by default', () => {
    const adapter = anthropic({ apiKey: 'x', model: 'claude-sonnet-4-6' })
    expect(adapter.capabilities?.multiModal).toBe(true)
  })

  it('gemini advertises streaming + tools', () => {
    const adapter = gemini({ apiKey: 'x', model: 'gemini-2.5-flash' })
    expect(adapter.capabilities?.streaming).toBe(true)
    expect(adapter.capabilities?.tools).toBe(true)
  })

  it('ollama defaults tools to false', () => {
    const adapter = ollama({ model: 'llama3.1' })
    expect(adapter.capabilities?.streaming).toBe(true)
    expect(adapter.capabilities?.tools).toBe(false)
  })

  it('ollama llava advertises multi-modal', () => {
    const adapter = ollama({ model: 'llava' })
    expect(adapter.capabilities?.multiModal).toBe(true)
  })

  it('mockAdapter advertises all capabilities true', () => {
    const adapter = mockAdapter({ response: [{ type: 'done' }] })
    expect(adapter.capabilities?.streaming).toBe(true)
    expect(adapter.capabilities?.tools).toBe(true)
    expect(adapter.capabilities?.reasoning).toBe(true)
    expect(adapter.capabilities?.multiModal).toBe(true)
  })

  it('vercelAI omits specific capabilities (provider-dependent)', () => {
    const adapter = vercelAI({ api: '/api/chat' })
    expect(adapter.capabilities?.streaming).toBeUndefined()
    expect(adapter.capabilities?.tools).toBeUndefined()
  })
})

describe('chunkText', () => {
  it('returns a single chunk for text below target size', () => {
    expect(chunkText('short', 32)).toEqual(['short'])
  })

  it('splits long text into chunks sized close to target', () => {
    const text = 'a'.repeat(128)
    const chunks = chunkText(text, 32)
    expect(chunks.length).toBe(4)
    expect(chunks.join('')).toBe(text)
  })

  it('prefers whitespace boundaries when near the target', () => {
    const text = 'word '.repeat(20)   // 100 chars
    const chunks = chunkText(text, 20)
    for (const chunk of chunks.slice(0, -1)) {
      // every non-last chunk should end near a space
      expect(chunk.endsWith(' ') || chunk.length === 20).toBe(true)
    }
    expect(chunks.join('')).toBe(text)
  })
})

describe('simulateStream', () => {
  const noopText = async (_res: Response) => ''

  async function collect(source: ReturnType<typeof simulateStream>): Promise<StreamChunk[]> {
    const out: StreamChunk[] = []
    for await (const chunk of source.stream()) out.push(chunk)
    return out
  }

  it('emits chunks from a non-streaming response', async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response('ok'))
    const extract = async () => 'hello world this is a test response'

    const source = simulateStream(doFetch, extract, 'Test', { delayMs: 0 })
    const chunks = await collect(source)

    expect(chunks.length).toBeGreaterThanOrEqual(2)
    const textChunks = chunks.filter(c => c.type === 'text').map(c => c.content).join('')
    expect(textChunks).toBe('hello world this is a test response')
    expect(chunks[chunks.length - 1]).toEqual({ type: 'done' })
  })

  it('emits an error chunk on non-ok responses', async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response('err', { status: 500 }))
    const source = simulateStream(doFetch, noopText, 'Test', {
      delayMs: 0,
      retry: { maxAttempts: 1, sleep: async () => {} },
    })
    const chunks = await collect(source)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: 'Test error: 500' })
    expect(chunks[0]!.metadata?.error).toBeInstanceOf(Error)
  })

  it('emits error chunk when extractText throws', async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const extract = async () => {
      throw new Error('parse body failed')
    }
    const source = simulateStream(doFetch, extract, 'Test', {
      delayMs: 0,
      retry: { maxAttempts: 1, sleep: async () => {} },
    })
    const chunks = await collect(source)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: 'parse body failed' })
    expect(chunks[0]!.metadata?.error).toBeInstanceOf(Error)
  })

  it('emits error chunk when extractText throws a non-Error', async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const extract = async () => {
      throw 'bad-body'
    }
    const source = simulateStream(doFetch, extract, 'Test', {
      delayMs: 0,
      retry: { maxAttempts: 1, sleep: async () => {} },
    })
    const chunks = await collect(source)
    expect(chunks[0]).toMatchObject({ type: 'error', content: 'bad-body' })
  })

  it('stops cleanly when aborted mid-stream', async () => {
    const doFetch = vi.fn().mockResolvedValue(new Response('ok'))
    const extract = async () => 'a'.repeat(200)

    const source = simulateStream(doFetch, extract, 'Test', { delayMs: 20, chunkSize: 10 })
    const chunks: StreamChunk[] = []
    const reader = (async () => {
      for await (const chunk of source.stream()) chunks.push(chunk)
    })()

    await new Promise(r => setTimeout(r, 50))
    source.abort()
    await reader

    expect(chunks.length).toBeLessThan(21)   // 200/10 = 20 text chunks + 1 done
  })
})
