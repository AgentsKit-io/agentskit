import { describe, expect, it, vi, afterEach } from 'vitest'
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
  // Configured baseUrl must reach the request (synthetic gateway host).
  { cfg: { provider: 'openai', model: 'm', apiKey: 'k', baseUrl: 'https://gateway.test/v1' }, sse: openaiSse, url: 'https://gateway.test/v1/chat/completions' },
  { cfg: { provider: 'openrouter', model: 'a/m', apiKey: 'k', baseUrl: 'https://gateway.test/v1' }, sse: openaiSse, url: 'https://gateway.test/v1/chat/completions' },
  { cfg: { provider: 'cliproxyapi', model: 'm', baseUrl: 'http://proxy.test:9000/v1' }, sse: openaiSse, url: 'http://proxy.test:9000/v1/chat/completions' },
  { cfg: { provider: 'anthropic', model: 'm', apiKey: 'k', baseUrl: 'https://gateway.test/v1' }, sse: anthropicSse, url: 'https://gateway.test/v1/messages' },
]

function requestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })

describe('createModelProvider', () => {
  for (const { cfg, sse, url } of cases) {
    it(`streams recorded ${cfg.provider} response via ${url}`, async () => {
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

  it('requires an apiKey except for cliproxyapi', () => {
    expect(() => createModelProvider({ provider: 'openai', model: 'm' })).toThrow(/apiKey/)
    expect(() => createModelProvider({ provider: 'cliproxyapi', model: 'm' })).not.toThrow()
  })
})
