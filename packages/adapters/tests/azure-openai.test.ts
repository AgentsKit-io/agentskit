import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { azureOpenAI, azureOpenAIAdapter } from '../src/azure-openai'

interface Capture { url?: string; body?: unknown; apiKey?: string }

let originalFetch: typeof globalThis.fetch
beforeEach(() => { originalFetch = globalThis.fetch })
afterEach(() => { globalThis.fetch = originalFetch })

function mockFetch(cap: Capture): void {
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    cap.url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    cap.body = init?.body
    cap.apiKey = (init?.headers as Record<string, string> | undefined)?.['api-key']
    throw new Error('stub')
  }) as typeof globalThis.fetch
}

async function drain(factory: ReturnType<typeof azureOpenAI>): Promise<void> {
  const source = factory.createSource({
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
  })
  const iter = source.stream()[Symbol.asyncIterator]()
  try { while (!(await iter.next()).done) { /* drain */ } } catch { /* expected */ }
}

const cfg = {
  apiKey: 'azure-key',
  endpoint: 'https://my-resource.openai.azure.com',
  deployment: 'my-gpt4o',
}

describe('azureOpenAIAdapter', () => {
  it('declares capabilities', () => {
    expect(azureOpenAI(cfg).capabilities).toEqual({ streaming: true, tools: true, usage: true })
  })

  it('exports as azureOpenAIAdapter alias', () => {
    expect(azureOpenAIAdapter).toBe(azureOpenAI)
  })

  it('routes to deployment URL with default api-version', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI(cfg))
    expect(cap.url).toBe(
      'https://my-resource.openai.azure.com/openai/deployments/my-gpt4o/chat/completions?api-version=2024-10-21',
    )
  })

  it('honours custom api-version', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI({ ...cfg, apiVersion: '2025-01-01-preview' }))
    expect(cap.url).toContain('api-version=2025-01-01-preview')
  })

  it('strips trailing slash on endpoint', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI({ ...cfg, endpoint: 'https://my-resource.openai.azure.com/' }))
    expect(cap.url).not.toContain('.com//openai')
  })

  it('encodes deployment name in URL', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI({ ...cfg, deployment: 'my deployment' }))
    expect(cap.url).toContain('/deployments/my%20deployment/')
  })

  it('uses api-key header (not Bearer)', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI(cfg))
    expect(cap.apiKey).toBe('azure-key')
  })

  it('streams with include_usage by default', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI(cfg))
    const body = JSON.parse(String(cap.body)) as { stream: boolean; stream_options: { include_usage: boolean } }
    expect(body.stream).toBe(true)
    expect(body.stream_options.include_usage).toBe(true)
  })

  it('omits stream_options when includeUsage is false', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(azureOpenAI({ ...cfg, includeUsage: false }))
    const body = JSON.parse(String(cap.body)) as { stream_options?: unknown }
    expect(body.stream_options).toBeUndefined()
  })
})
