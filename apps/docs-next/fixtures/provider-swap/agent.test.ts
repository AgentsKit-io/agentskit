import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PROVIDER_DEFAULTS,
  providerFromEnv,
  runTask,
  selectAdapter,
  type LiveProvider,
} from './agent'

const openAIStream =
  'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n' +
  'data: [DONE]\n\n'

const anthropicStream =
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}\n\n' +
  'data: {"type":"message_stop"}\n\n'

const geminiStream =
  'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]},"finishReason":"STOP"}]}\n\n'

const ollamaStream =
  '{"message":{"content":"hi"}}\n' +
  '{"done":true}\n'

const cases: Array<{
  provider: LiveProvider
  env: Record<string, string>
  body: string
  contentType?: string
  url: RegExp
}> = [
  {
    provider: 'openai',
    env: { OPENAI_API_KEY: 'test-openai' },
    body: openAIStream,
    url: /^https:\/\/api\.openai\.com\/v1\/chat\/completions$/,
  },
  {
    provider: 'anthropic',
    env: { ANTHROPIC_API_KEY: 'test-anthropic' },
    body: anthropicStream,
    url: /^https:\/\/api\.anthropic\.com\/v1\/messages$/,
  },
  {
    provider: 'gemini',
    env: { GOOGLE_API_KEY: 'test-google' },
    body: geminiStream,
    url: /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:streamGenerateContent\?alt=sse$/,
  },
  {
    provider: 'openrouter',
    env: { OPENROUTER_API_KEY: 'test-openrouter' },
    body: openAIStream,
    url: /^https:\/\/openrouter\.ai\/api\/v1\/chat\/completions$/,
  },
  {
    provider: 'groq',
    env: { GROQ_API_KEY: 'test-groq' },
    body: openAIStream,
    url: /^https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions$/,
  },
  {
    provider: 'ollama',
    env: {},
    body: ollamaStream,
    contentType: 'application/x-ndjson',
    url: /^http:\/\/localhost:11434\/api\/chat$/,
  },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('provider-swap fixture', () => {
  it.each(cases)('runs the same task path with $provider', async ({
    provider,
    env,
    body,
    contentType = 'text/event-stream',
    url,
  }) => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(body, {
      status: 200,
      headers: { 'content-type': contentType },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runTask(selectAdapter(provider, env), 'say hi')

    expect(result.content).toBe('hi')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(url)
  })

  it('keeps explicit, documented defaults for every provider', () => {
    expect(PROVIDER_DEFAULTS).toEqual({
      openai: { envVar: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
      anthropic: { envVar: 'ANTHROPIC_API_KEY', model: 'claude-sonnet-4-6' },
      gemini: { envVar: 'GOOGLE_API_KEY', model: 'gemini-2.5-flash' },
      openrouter: { envVar: 'OPENROUTER_API_KEY', model: 'openrouter/free' },
      groq: { envVar: 'GROQ_API_KEY', model: 'openai/gpt-oss-120b' },
      ollama: { envVar: null, model: 'llama3.2' },
    })
  })

  it.each(cases.filter(({ provider }) => provider !== 'ollama'))(
    'rejects missing credentials before transport for $provider',
    ({ provider }) => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      expect(() => selectAdapter(provider, {})).toThrow(
        `${PROVIDER_DEFAULTS[provider].envVar} is required for provider=${provider}`,
      )
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('accepts model and Ollama base URL overrides', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(ollamaStream, {
      status: 200,
      headers: { 'content-type': 'application/x-ndjson' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await runTask(selectAdapter('ollama', {
      AGENT_MODEL: 'qwen2.5',
      OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
    }), 'say hi')

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://127.0.0.1:11434/api/chat')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'qwen2.5' })
  })

  it('defaults the CLI to the credential-free demo and rejects unknown names', () => {
    expect(providerFromEnv(undefined)).toBe('demo')
    expect(providerFromEnv('groq')).toBe('groq')
    expect(() => providerFromEnv('unknown')).toThrow('Unsupported AGENT_PROVIDER: unknown')
  })
})
