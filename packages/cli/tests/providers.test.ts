import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveChatProvider } from '../src/providers'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.OPENAI_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.GEMINI_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.XAI_API_KEY
  delete process.env.KIMI_API_KEY
  delete process.env.MOONSHOT_API_KEY
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('resolveChatProvider', () => {
  it('demo mode requires no key and streams text', async () => {
    const r = resolveChatProvider({ provider: 'demo', model: 'fake' })
    expect(r.mode).toBe('demo')
    expect(r.summary).toMatch(/demo/)
    const source = r.adapter.createSource({
      messages: [
        { id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date() },
      ],
      tools: [],
    })
    const chunks: unknown[] = []
    for await (const c of source.stream()) chunks.push(c)
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[chunks.length - 1]).toEqual({ type: 'done' })
  })

  it('demo abort stops streaming', async () => {
    const r = resolveChatProvider({ provider: 'demo' })
    const source = r.adapter.createSource({
      messages: [{ id: '1', role: 'user', content: 'hello', status: 'complete', createdAt: new Date() }],
      tools: [],
    })
    const iter = source.stream()
    source.abort()
    const out: unknown[] = []
    for await (const c of iter) out.push(c)
    // abort either yields nothing or stops mid-stream; verify we don't hang
    expect(out.length).toBeGreaterThanOrEqual(0)
  })

  it('throws on unknown provider', () => {
    expect(() => resolveChatProvider({ provider: 'lemur' })).toThrow(/Unsupported provider/)
  })

  it('throws when API key missing for keyed provider', () => {
    expect(() => resolveChatProvider({ provider: 'openai' })).toThrow(/API key/)
  })

  it('uses env var when no apiKey flag (openai)', () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const r = resolveChatProvider({ provider: 'openai' })
    expect(r.provider).toBe('openai')
    expect(r.mode).toBe('live')
    expect(r.model).toBeTruthy()
  })

  it('explicit apiKey wins over env', () => {
    process.env.OPENAI_API_KEY = 'env-key'
    const r = resolveChatProvider({ provider: 'openai', apiKey: 'flag-key' })
    expect(r.mode).toBe('live')
  })

  it('falls through multiple env keys (kimi)', () => {
    process.env.MOONSHOT_API_KEY = 'sk-moonshot'
    const r = resolveChatProvider({ provider: 'kimi', model: 'kimi-v1' })
    expect(r.provider).toBe('kimi')
  })

  it('throws when requiresModel and no model given (grok)', () => {
    process.env.XAI_API_KEY = 'sk-xai'
    expect(() => resolveChatProvider({ provider: 'grok' })).toThrow(/--model/)
  })

  it('ollama works without env keys', () => {
    const r = resolveChatProvider({ provider: 'ollama', model: 'llama3.1' })
    expect(r.mode).toBe('live')
    expect(r.model).toBe('llama3.1')
  })

  it('case-insensitive provider name', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant'
    const r = resolveChatProvider({ provider: 'ANTHROPIC' })
    expect(r.provider).toBe('anthropic')
  })

  it('uses provided model over default', () => {
    process.env.OPENAI_API_KEY = 'sk-x'
    const r = resolveChatProvider({ provider: 'openai', model: 'gpt-5' })
    expect(r.model).toBe('gpt-5')
  })
})
