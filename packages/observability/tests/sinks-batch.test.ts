import { describe, it, expect, vi } from 'vitest'
import { datadogSink, axiomSink, newRelicSink } from '../src/index'

interface Capture { url: string; init: RequestInit }

function fakeFetch(): { fetch: typeof fetch; calls: Capture[] } {
  const calls: Capture[] = []
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    return new Response('{}', { status: 202 })
  }) as unknown as typeof globalThis.fetch
  return { fetch, calls }
}

const llmStartEvent = {
  type: 'llm:start' as const,
  spanId: 'span-1',
  parentSpanId: undefined,
  attributes: { 'gen_ai.system': 'openai', 'gen_ai.model': 'gpt-4o' },
  startTime: 1_700_000_000_000,
}

const llmEndEvent = {
  type: 'llm:end' as const,
  spanId: 'span-1',
  content: 'hello',
  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  attributes: { 'gen_ai.usage.total_tokens': 15 },
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_000_500,
}

async function flush() { await new Promise(r => setTimeout(r, 5)) }

describe('datadogSink', () => {
  it('POSTs span start + end to the Datadog logs intake', async () => {
    const { fetch, calls } = fakeFetch()
    const sink = datadogSink({ apiKey: 'dd-test', service: 'svc', env: 'prod', fetch })
    sink.on(llmStartEvent)
    sink.on(llmEndEvent)
    await flush()
    expect(calls.length).toBe(2)
    expect(calls[0].url).toContain('http-intake.logs.datadoghq.com')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers['dd-api-key']).toBe('dd-test')
    const body = JSON.parse(String(calls[0].init.body)) as Array<Record<string, unknown>>
    expect(body[0].service).toBe('svc')
    expect(String(body[0].ddtags)).toContain('env:prod')
  })

  it('honors the site option for non-US regions', async () => {
    const { fetch, calls } = fakeFetch()
    const sink = datadogSink({ apiKey: 'k', site: 'datadoghq.eu', fetch })
    sink.on(llmStartEvent)
    await flush()
    expect(calls[0].url).toContain('http-intake.logs.datadoghq.eu')
  })
})

describe('axiomSink', () => {
  it('POSTs to the dataset ingest URL with Bearer auth', async () => {
    const { fetch, calls } = fakeFetch()
    const sink = axiomSink({ token: 'xaat-test', dataset: 'agentskit', service: 'svc', fetch })
    sink.on(llmStartEvent)
    await flush()
    expect(calls[0].url).toBe('https://api.axiom.co/v1/datasets/agentskit/ingest')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer xaat-test')
    const body = JSON.parse(String(calls[0].init.body)) as Array<Record<string, unknown>>
    expect(body[0].service).toBe('svc')
    expect(body[0].phase).toBe('start')
  })

  it('honors a custom endpoint (EU region)', async () => {
    const { fetch, calls } = fakeFetch()
    const sink = axiomSink({ token: 't', dataset: 'd', endpoint: 'https://api.eu.axiom.co', fetch })
    sink.on(llmStartEvent)
    await flush()
    expect(calls[0].url).toBe('https://api.eu.axiom.co/v1/datasets/d/ingest')
  })
})

describe('newRelicSink', () => {
  it('POSTs to log-api.newrelic.com by default', async () => {
    const { fetch, calls } = fakeFetch()
    const sink = newRelicSink({ apiKey: 'nrak-test', service: 'svc', fetch })
    sink.on(llmStartEvent)
    await flush()
    expect(calls[0].url).toBe('https://log-api.newrelic.com/log/v1')
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers['api-key']).toBe('nrak-test')
  })

  it('routes EU region to log-api.eu.newrelic.com', async () => {
    const { fetch, calls } = fakeFetch()
    const sink = newRelicSink({ apiKey: 'k', region: 'EU', fetch })
    sink.on(llmStartEvent)
    await flush()
    expect(calls[0].url).toBe('https://log-api.eu.newrelic.com/log/v1')
  })
})
