import { readFileSync } from 'node:fs'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { partsToText, type AdapterFactory, type ContentPart, type Message } from '@agentskit/core'
import { openai } from '../src/openai'
import { openaiCompatible } from '../src/openai-compatible'
import { anthropic } from '../src/anthropic'
import { gemini } from '../src/gemini'
import { vertex } from '../src/vertex'
import { ollama } from '../src/ollama'
import { dispatchFromCatalog } from '../src/catalog/dispatch'
import { listProviders } from '../src/catalog/loader'

export const multimodalCases = [
  { provider: 'openai', image: 'image_url', file: 'file', sources: 'image URL/data URL; file data URL/id' },
  { provider: 'openai-compatible', image: 'image_url', file: 'file', sources: 'same wire format; opt into model capability' },
  { provider: 'anthropic', image: 'image', file: 'document', sources: 'image URL/data URL; PDF URL/data URL; text data URL' },
  { provider: 'gemini', image: 'inlineData/fileData', file: 'inlineData/fileData', sources: 'data URL or provider URI with MIME type' },
  { provider: 'vertex', image: 'inlineData/fileData', file: 'inlineData/fileData', sources: 'data URL or provider URI with MIME type' },
  { provider: 'ollama', image: 'images', file: 'image data URL only', sources: 'image data URL only; vision model required; PDF rejected' },
] as const

const png = 'data:image/png;base64,aW1hZ2U='
const pdf = 'data:application/pdf;base64,cGRm'
function message(parts: ContentPart[], role: Message['role'] = 'user'): Message {
  return { id: 'synthetic', role, content: partsToText(parts), parts, status: 'complete', createdAt: new Date(0) }
}
let server: ReturnType<typeof createServer>
let baseUrl: string
let captured: { path: string; headers: IncomingHttpHeaders; body: Record<string, unknown> }[]
beforeEach(async () => {
  captured = []
  server = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    captured.push({ path: req.url!, headers: req.headers, body: JSON.parse(body) })
    res.setHeader('Content-Type', 'text/event-stream')
    if (req.url!.includes('/messages')) res.end('data: {"type":"message_stop"}\n\n')
    else if (req.url!.includes('streamGenerateContent')) res.end('data: {"candidates":[{"finishReason":"STOP"}]}\n\n')
    else if (req.url === '/api/chat') res.end('{"done":true}\n')
    else res.end('data: {"choices":[{"delta":{"content":"ok"}}],"usage":{"prompt_tokens":2,"completion_tokens":1,"total_tokens":3}}\n\ndata: [DONE]\n\n')
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No local address')
  baseUrl = `http://127.0.0.1:${address.port}`
})
afterEach(async () => {
  vi.unstubAllGlobals()
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
})
async function send(adapter: AdapterFactory, parts: ContentPart[]) {
  const source = adapter.createSource({ messages: [message(parts)] })
  const chunks = []
  for await (const chunk of source.stream()) chunks.push(chunk)
  expect(chunks.at(-1)?.type).toBe('done')
  return captured.at(-1)!.body
}

describe('multimodal HTTP contract', () => {
  it.each(['openai', 'openai-compatible'])('%s preserves ordered parts, detail and files', async provider => {
    const body = await send((provider === 'openai' ? openai : openaiCompatible)({ apiKey: 'synthetic', model: provider === 'openai' ? 'gpt-4o' : 'custom', baseUrl, capabilities: { multiModal: true } }), [
      { type: 'text', text: 'inspect' }, { type: 'image', source: png, detail: 'high' },
      { type: 'file', source: pdf, filename: 'sample.pdf' },
    ])
    expect(body.messages).toEqual([{ role: 'user', content: [
      { type: 'text', text: 'inspect' }, { type: 'image_url', image_url: { url: png, detail: 'high' } },
      { type: 'file', file: { file_data: pdf, filename: 'sample.pdf' } },
    ] }])
  })
  it('Anthropic sends image and PDF blocks', async () => {
    const body = await send(anthropic({ apiKey: 'synthetic', model: 'claude', baseUrl }), [
      { type: 'image', source: png }, { type: 'file', source: pdf },
    ])
    expect(body.messages).toEqual([{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'aW1hZ2U=' } },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'cGRm' } },
    ] }])
  })
  it.each(['gemini', 'vertex'])('%s sends inlineData and fileData', async provider => {
    const nativeFetch = globalThis.fetch
    if (provider === 'vertex') vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => nativeFetch(`${baseUrl}/streamGenerateContent`, init))
    const adapter = provider === 'gemini'
      ? gemini({ apiKey: 'synthetic', model: 'gemini', baseUrl })
      : vertex({ project: 'synthetic', region: 'synthetic', model: 'gemini', accessToken: 'synthetic' })
    const body = await send(adapter, [{ type: 'image', source: png }, { type: 'file', source: 'gs://synthetic/sample.pdf', mimeType: 'application/pdf' }])
    expect(body.contents).toEqual([{ role: 'user', parts: [
      { inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } },
      { fileData: { mimeType: 'application/pdf', fileUri: 'gs://synthetic/sample.pdf' } },
    ] }])
  })
  it('Ollama sends images without the data URL prefix', async () => {
    const body = await send(ollama({ model: 'llava', baseUrl }), [{ type: 'text', text: 'inspect' }, { type: 'image', source: png }])
    expect(body.messages).toEqual([{ role: 'user', content: 'inspect', images: ['aW1hZ2U='] }])
  })
  it('rejects unsupported modalities before network I/O', () => {
    expect(() => ollama({ model: 'llava', baseUrl }).createSource({ messages: [message([{ type: 'file', source: pdf }])] })).toThrow(expect.objectContaining({ code: 'CAPABILITY_UNSUPPORTED' }))
    expect(captured).toHaveLength(0)
  })
  it.each([
    ['gpt-3.5', undefined], ['gpt-4o', false],
  ] as const)('falls back to text with a warning for %s, including old image history', async (model, multiModal) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const adapter = openai({ apiKey: 'synthetic', model, baseUrl, ...(multiModal === undefined ? {} : { capabilities: { multiModal } }) })
      const messages = [message([{ type: 'text', text: 'inspect' }, { type: 'image', source: png }, { type: 'file', source: pdf, filename: 'sample.pdf' }]),
        message([{ type: 'image', source: png }]),
        message([{ type: 'file', source: pdf }]),
        { ...message([], 'assistant'), content: 'old answer' },
        { ...message([{ type: 'text', text: 'followup' }]), content: 'followup' }]
      const before = JSON.stringify(messages)
      const chunks = []
      for await (const chunk of adapter.createSource({ messages }).stream()) chunks.push(chunk)
      expect(chunks.at(-1)?.type).toBe('done')
      expect(captured[0]?.body.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'inspect\n[image omitted]\n[file: sample.pdf]' }] },
        { role: 'user', content: [{ type: 'text', text: '[image omitted]' }] },
        { role: 'user', content: [{ type: 'text', text: '[file: omitted]' }] },
        { role: 'assistant', content: 'old answer' },
        { role: 'user', content: [{ type: 'text', text: 'followup' }] },
      ])
      expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('text fallback'))
      expect(JSON.stringify(captured[0]?.body)).not.toContain('data:')
      expect(JSON.stringify(captured[0]?.body)).not.toContain('aW1hZ2U=')
      for await (const _chunk of adapter.createSource({ messages }).stream()) { /* drain */ }
      expect(warning).toHaveBeenCalledTimes(2)
      expect(JSON.stringify(messages)).toBe(before)
    } finally { warning.mockRestore() }
  })
  it.each(['openai', 'anthropic'])('%s omits binary assistant parts while preserving text and tool calls', async provider => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const messages = [message([{ type: 'image', source: png }], 'assistant'),
        { ...message([{ type: 'text', text: 'checking' }, { type: 'file', source: pdf, filename: 'sample.pdf' }], 'assistant'), toolCalls: [{ id: 'call', name: 'inspect', args: {}, status: 'complete' as const }] }]
      const adapter = provider === 'openai' ? openai({ apiKey: 'synthetic', model: 'gpt-4o', baseUrl }) : anthropic({ apiKey: 'synthetic', model: 'claude', baseUrl })
      for await (const _chunk of adapter.createSource({ messages }).stream()) { /* drain */ }
      const text = { type: 'text', text: 'checking\n[file: sample.pdf]' }
      expect(captured[0]?.body.messages).toEqual([
        { role: 'assistant', content: [{ type: 'text', text: '[image omitted]' }] },
        provider === 'openai'
          ? { role: 'assistant', content: [text], tool_calls: [{ id: 'call', type: 'function', function: { name: 'inspect', arguments: '{}' } }] }
          : { role: 'assistant', content: [text, { type: 'tool_use', id: 'call', name: 'inspect', input: {} }] },
      ])
      expect(warning).toHaveBeenCalledOnce()
      expect(JSON.stringify(captured[0]?.body)).not.toContain('data:')
    } finally { warning.mockRestore() }
  })
  it('Ollama text-only requests omit binary sources and warn once per request', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const messages = [
        message([{ type: 'image', source: png }]),
        message([{ type: 'text', text: 'inspect' }, { type: 'file', source: pdf, filename: 'sample.pdf' }]),
        message([{ type: 'file', source: pdf }]),
      ]
      const before = JSON.stringify(messages)
      expect(messages[0]!.content).toBe(partsToText(messages[0]!.parts!))
      expect(messages[0]!.content).toContain(png)
      const adapter = ollama({ model: 'llama3.1', baseUrl })
      for await (const _chunk of adapter.createSource({ messages }).stream()) { /* drain */ }
      expect(captured[0]?.body.messages).toEqual([
        { role: 'user', content: '[image omitted]' },
        { role: 'user', content: 'inspect\n[file: sample.pdf]' },
        { role: 'user', content: '[file: omitted]' },
      ])
      expect(warning).toHaveBeenCalledOnce()
      expect(JSON.stringify(captured[0]?.body)).not.toContain('data:')
      expect(JSON.stringify(messages)).toBe(before)
      for await (const _chunk of adapter.createSource({ messages }).stream()) { /* drain */ }
      expect(warning).toHaveBeenCalledTimes(2)
    } finally { warning.mockRestore() }
  })
  it('custom gateway path/headers/fetch preserves streaming and usage without Bearer', async () => {
    const transport = vi.fn(globalThis.fetch)
    const config = { model: 'custom', baseUrl: `${baseUrl}/gateway`, path: '/compat/chat/completions', headers: { 'cf-aig-authorization': 'synthetic', 'X-Custom': 'present' }, fetch: transport, includeUsage: true }
    const adapter = openaiCompatible(config)
    const chunks = []
    for await (const chunk of adapter.createSource({ messages: [message([{ type: 'text', text: 'hello' }])] }).stream()) chunks.push(chunk)
    expect(captured[0]?.path).toBe('/gateway/compat/chat/completions')
    expect(captured[0]?.headers.authorization).toBeUndefined()
    expect(captured[0]?.headers['cf-aig-authorization']).toBe('synthetic')
    expect(captured[0]?.headers['x-custom']).toBe('present')
    expect(transport).toHaveBeenCalledOnce()
    expect(chunks).toContainEqual({ type: 'text', content: 'ok' })
    expect(chunks).toContainEqual(expect.objectContaining({ type: 'usage', usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 } }))
  })
})

// Presets still use a real HTTP server: only the destination host is redirected.
describe('OpenAI-compatible presets', () => {
  it('routes OpenRouter, AI Gateway and Workers AI with documented headers', async () => {
    const { openRouter, openrouter } = await import('../src/openrouter')
    const { cloudflareAiGateway, workersAi } = await import('../src/cloudflare')
    expect(openRouter).toBe(openrouter)
    const nativeFetch = globalThis.fetch
    const destinations: string[] = []
    const transport: typeof fetch = (input, init) => {
      const url = String(input)
      destinations.push(url)
      const redirected = new URL(url)
      redirected.host = new URL(baseUrl).host
      redirected.protocol = 'http:'
      return nativeFetch(redirected, init)
    }
    await send(openRouter({ model: 'google/gemini-2.5-flash-lite', apiKey: 'synthetic', fetch: transport, headers: { 'HTTP-Referer': 'https://example.test', 'X-Title': 'Synthetic' } }), [{ type: 'text', text: 'hello' }])
    await send(cloudflareAiGateway({ accountId: 'account', gatewayId: 'gateway', gatewayToken: 'synthetic', model: 'openrouter/google/gemini-2.5-flash-lite', fetch: transport }), [{ type: 'text', text: 'hello' }])
    await send(workersAi({ accountId: 'account', apiKey: 'synthetic', model: '@cf/meta/model', fetch: transport }), [{ type: 'text', text: 'hello' }])
    expect(destinations).toEqual([
      'https://openrouter.ai/api/v1/chat/completions',
      'https://gateway.ai.cloudflare.com/v1/account/gateway/compat/chat/completions',
      'https://api.cloudflare.com/client/v4/accounts/account/ai/v1/chat/completions',
    ])
    expect(captured[0]?.headers).toMatchObject({ authorization: 'Bearer synthetic', 'http-referer': 'https://example.test', 'x-title': 'Synthetic' })
    expect(captured[1]?.headers['cf-aig-authorization']).toBe('Bearer synthetic')
    expect(captured[1]?.headers.authorization).toBeUndefined()
    expect(captured[2]?.headers.authorization).toBe('Bearer synthetic')
  })
  it('catalog interpolates explicit Cloudflare account id and rejects missing variables', async () => {
    const provider = listProviders().find(p => p.baseUrl?.includes('${CLOUDFLARE_ACCOUNT_ID}') && p.openaiCompatible)!
    expect(provider).toBeDefined()
    expect(() => dispatchFromCatalog({ provider: provider.id, model: 'custom', apiKey: 'synthetic' })).toThrow(expect.objectContaining({ code: 'MISSING_URL_VARIABLE' }))
    const nativeFetch = globalThis.fetch
    let destination = ''
    const transport: typeof fetch = (input, init) => {
      destination = String(input)
      const redirected = new URL(destination)
      redirected.host = new URL(baseUrl).host
      redirected.protocol = 'http:'
      return nativeFetch(redirected, init)
    }
    await send(dispatchFromCatalog({ provider: provider.id, model: 'custom', apiKey: 'synthetic', env: { CLOUDFLARE_ACCOUNT_ID: 'synthetic-account' }, fetch: transport }), [{ type: 'text', text: 'hello' }])
    expect(destination).toBe('https://api.cloudflare.com/client/v4/accounts/synthetic-account/ai/v1/chat/completions')
  })
})

describe('multimodal boundaries and history', () => {
  it('sends URL image sources and provider file identifiers', async () => {
    expect((await send(openai({ apiKey: 'synthetic', model: 'gpt-4o', baseUrl }), [{ type: 'image', source: 'https://example.test/image.png' }, { type: 'file', source: 'file-synthetic' }])).messages).toEqual([{ role: 'user', content: [
      { type: 'image_url', image_url: { url: 'https://example.test/image.png' } }, { type: 'file', file: { file_id: 'file-synthetic' } },
    ] }])
    expect((await send(anthropic({ apiKey: 'synthetic', model: 'claude', baseUrl }), [{ type: 'image', source: 'https://example.test/image.png' }, { type: 'file', source: 'https://example.test/sample.pdf', mimeType: 'application/pdf' }])).messages).toEqual([{ role: 'user', content: [
      { type: 'image', source: { type: 'url', url: 'https://example.test/image.png' } }, { type: 'document', source: { type: 'url', url: 'https://example.test/sample.pdf' } },
    ] }])
    expect((await send(gemini({ apiKey: 'synthetic', model: 'gemini', baseUrl }), [{ type: 'file', source: pdf }])).contents).toEqual([{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: 'cGRm' } }] }])
  })
  it('rejects unknown sources, missing MIME types, and unsupported audio/video without sending', () => {
    const adapters = [openai({ apiKey: 'synthetic', model: 'gpt-4o', baseUrl }), anthropic({ apiKey: 'synthetic', model: 'claude', baseUrl }), gemini({ apiKey: 'synthetic', model: 'gemini', baseUrl }), ollama({ model: 'llava', baseUrl })]
    for (const adapter of adapters) for (const part of [
      { type: 'audio', source: 'https://example.test/audio.wav' },
      { type: 'video', source: 'https://example.test/video.mp4' },
      { type: 'image', source: 'data:image/png;base64,invalid!' },
      { type: 'image', source: 'unknown-reference' },
      { type: 'image', source: pdf },
    ] as ContentPart[]) expect(() => adapter.createSource({ messages: [message([part])] })).toThrow(expect.objectContaining({ code: 'CAPABILITY_UNSUPPORTED' }))
    expect(() => adapters[2]!.createSource({ messages: [message([{ type: 'file', source: 'gs://synthetic/no-mime' }])] })).toThrow(expect.objectContaining({ code: 'CAPABILITY_UNSUPPORTED' }))
    expect(() => adapters[1]!.createSource({ messages: [message([{ type: 'file', source: 'data:text/plain;base64,/w==' }])] })).toThrow(expect.objectContaining({ code: 'CAPABILITY_UNSUPPORTED' }))
    expect(captured).toHaveLength(0)
  })
  it('keeps parts on assistant tool calls and merged user turns', async () => {
    const messages: Message[] = [
      message([{ type: 'image', source: png }]),
      { ...message([{ type: 'text', text: 'checking' }], 'assistant'), id: 'assistant', toolCalls: [{ id: 'call', name: 'inspect', args: {}, status: 'complete' }] },
      { ...message([], 'tool'), id: 'tool', toolCallId: 'call', content: 'result' },
      { ...message([{ type: 'file', source: pdf }]), id: 'followup' },
    ]
    for (const adapter of [openai({ apiKey: 'synthetic', model: 'gpt-4o', baseUrl }), anthropic({ apiKey: 'synthetic', model: 'claude', baseUrl }), gemini({ apiKey: 'synthetic', model: 'gemini', baseUrl })]) {
      for await (const _chunk of adapter.createSource({ messages }).stream()) { /* drain */ }
      const wire = JSON.stringify(captured.at(-1)!.body)
      expect(wire).toContain('aW1hZ2U=')
      expect(wire).toContain('cGRm')
      expect(wire).toContain('checking')
      expect(wire).toContain('result')
      expect(wire).toContain('call')
      expect(wire).not.toContain('legacy projection')
    }
  })
})

const capabilityTable = [
  '| Adapter | Image wire format | File wire format | Tested sources / limits |',
  '| --- | --- | --- | --- |',
  ...multimodalCases.map(row => `| ${row.provider} | ${row.image} | ${row.file} | ${row.sources} |`),
].join('\n') + '\n'

it('keeps the generated capability table and recipe aligned with HTTP cases', async () => {
  await expect(capabilityTable).toMatchFileSnapshot('../../../docs/adapter-modalities.md')
  const recipe = readFileSync(new URL('../../../apps/docs-next/content/docs/reference/recipes/multi-modal.mdx', import.meta.url), 'utf8')
  expect(recipe).toContain(capabilityTable.trim())
})

it('encodes inline text documents and Ollama image file parts', async () => {
  expect((await send(anthropic({ apiKey: 'synthetic', model: 'claude', baseUrl }), [{ type: 'file', source: 'data:text/plain;base64,aGVsbG8=' }])).messages).toEqual([{ role: 'user', content: [{ type: 'document', source: { type: 'text', media_type: 'text/plain', data: 'hello' } }] }])
  expect((await send(ollama({ model: 'custom-vision-model', multiModal: true, baseUrl }), [{ type: 'file', source: png }])).messages).toEqual([{ role: 'user', content: '', images: ['aW1hZ2U='] }])
})

it('honors case-insensitive caller authentication overrides', async () => {
  const { cloudflareAiGateway } = await import('../src/cloudflare')
  await send(openaiCompatible({ apiKey: 'synthetic', model: 'custom', baseUrl, headers: { authorization: 'Basic synthetic' } }), [{ type: 'text', text: 'hello' }])
  expect(captured[0]?.headers.authorization).toBe('Basic synthetic')
  await send(cloudflareAiGateway({ accountId: 'synthetic', gatewayId: 'synthetic', gatewayToken: 'default-synthetic', model: 'custom', baseUrl, headers: { 'CF-AIG-Authorization': 'Bearer override-synthetic' } }), [{ type: 'text', text: 'hello' }])
  expect(captured[1]?.headers['cf-aig-authorization']).toBe('Bearer override-synthetic')
})
