import { describe, expect, it, vi, afterEach, beforeAll } from 'vitest'
import { createModelProvider, type ModelProviderConfig } from '../src/provider'

// Recorded (synthetic, trimmed) SSE responses per provider wire format.
const openaiSse = [
  'data: {"choices":[{"delta":{"content":"Hello"}}]}',
  'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}]}',
  'data: [DONE]',
  '',
].join('\n\n')

const anthropicSse = [
  'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":3}}}',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}',
  'event: message_stop\ndata: {"type":"message_stop"}',
  '',
].join('\n\n')

const cases: Array<{ cfg: ModelProviderConfig; sse: string; url: string }> = [
  { cfg: { provider: 'openai', model: 'm', apiKey: 'k' }, sse: openaiSse, url: 'https://api.openai.com/v1/chat/completions' },
  { cfg: { provider: 'openrouter', model: 'a/m', apiKey: 'k' }, sse: openaiSse, url: 'https://openrouter.ai/api/v1/chat/completions' },
  { cfg: { provider: 'cliproxyapi', model: 'm' }, sse: openaiSse, url: 'http://127.0.0.1:8317/v1/chat/completions' },
  { cfg: { provider: 'anthropic', model: 'm', apiKey: 'k' }, sse: anthropicSse, url: 'https://api.anthropic.com/v1/messages' },
]

function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })

describe('createModelProvider', () => {
  // The provider lazy-loads the large catalog on the first done chunk; warm it
  // so the first streaming test does not pay the cold import inside its timeout.
  beforeAll(async () => { await import('@agentskit/adapters/catalog') }, 60_000)

  for (const { cfg, sse, url } of cases) {
    it(`streams recorded ${cfg.provider} response through the common port`, async () => {
      const calls: string[] = []
      globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
        calls.push(requestUrl(input))
        return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } })
      }) as typeof globalThis.fetch

      const source = createModelProvider(cfg).createSource({
        messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
      })
      let text = ''
      let done = false
      for await (const chunk of source.stream()) {
        if (chunk.type === 'text') text += chunk.content ?? ''
        if (chunk.type === 'done') done = true
      }
      expect(calls[0]).toBe(url)
      expect(text).toBe('Hello world')
      expect(done).toBe(true)
    })
  }

  const request = { messages: [{ id: '1', role: 'user' as const, content: 'hi', status: 'complete' as const, createdAt: new Date(0) }] }
  const doneCost = async (cfg: ModelProviderConfig, sse: string) => {
    globalThis.fetch = vi.fn(async () => new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } })) as typeof globalThis.fetch
    for await (const chunk of createModelProvider(cfg).createSource(request).stream()) {
      if (chunk.type === 'done') return chunk.metadata?.cost as Record<string, unknown>
    }
  }

  it('returns tokens and the exact catalog USD cost for a recorded openai response', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hi"}}]}',
      'data: {"choices":[],"usage":{"prompt_tokens":1200,"completion_tokens":300,"total_tokens":1500}}',
      'data: [DONE]',
      '',
    ].join('\n\n')
    const { catalog } = await import('../src/catalog')
    const price = catalog.providers.find(p => p.id === 'openai')!.models.find(m => m.id === 'gpt-4o')!.cost!
    const cost = await doneCost({ provider: 'openai', model: 'gpt-4o', apiKey: 'k' }, sse)
    expect(cost).toMatchObject({ inputTokens: 1200, outputTokens: 300, usageReported: true, priceSource: 'catalog' })
    expect(cost?.costUsd).toBe((1200 * price.input! + 300 * price.output!) / 1e6)
  })

  it('applies priceOverrides from the config', async () => {
    const sse = 'data: {"choices":[],"usage":{"prompt_tokens":1000000,"completion_tokens":1000000,"total_tokens":2000000}}\n\ndata: [DONE]\n\n'
    const cost = await doneCost(
      { provider: 'openai', model: 'gpt-4o', apiKey: 'k', priceOverrides: { 'openai/gpt-4o': { input: 1, output: 2 } } },
      sse,
    )
    expect(cost).toMatchObject({ costUsd: 3, priceSource: 'override' })
  })

  it('marks a response without usage as usageReported:false', async () => {
    const cost = await doneCost({ provider: 'openai', model: 'gpt-4o', apiKey: 'k' }, openaiSse)
    expect(cost).toMatchObject({ usageReported: false, costUsd: undefined })
  })

  it('requires an apiKey except for cliproxyapi', () => {
    expect(() => createModelProvider({ provider: 'openai', model: 'm' })).toThrow(/apiKey/)
    expect(() => createModelProvider({ provider: 'cliproxyapi', model: 'm' })).not.toThrow()
  })
})
