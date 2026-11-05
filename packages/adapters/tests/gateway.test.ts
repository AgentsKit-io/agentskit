import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { AdapterFactory, StreamChunk } from '@agentskit/core'
import { BudgetExceededError, createCostBudget, createModelGateway, type GatewayProvider } from '../src/gateway'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures/gateway', `${name}.sse`), 'utf8')

function recorded(name: string) {
  return vi.fn(async (_url: unknown, _init?: unknown) =>
    new Response(fixture(name), { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
  ) as unknown as typeof globalThis.fetch & ReturnType<typeof vi.fn>
}

const request = {
  messages: [{ id: '1', role: 'user' as const, content: 'hi', status: 'complete' as const, createdAt: new Date(0) }],
}

async function collect(adapter: AdapterFactory, req = request): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of adapter.createSource(req).stream()) out.push(c)
  return out
}

const pricing = { input: 3, output: 15 } // $/1M → 1000 in + 500 out = $0.0105

const cases: Array<[GatewayProvider, string, string, string | undefined]> = [
  ['openai', 'openai', 'https://api.openai.com/v1/chat/completions', 'sk-x'],
  ['openrouter', 'openrouter', 'https://openrouter.ai/api/v1/chat/completions', 'sk-or'],
  ['anthropic', 'anthropic', 'https://api.anthropic.com/v1/messages', 'sk-ant'],
  ['cliproxyapi', 'cliproxyapi', 'http://localhost:8317/v1/chat/completions', undefined],
]

describe('createModelGateway — recorded provider responses', () => {
  it.each(cases)('%s: streams text and reports tokens + cost', async (provider, fix, url, apiKey) => {
    const fetch = recorded(fix)
    const onUsage = vi.fn()
    const chunks = await collect(createModelGateway({ provider, model: 'm', apiKey, pricing, fetch, onUsage }))

    expect(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toBe(url)
    expect(chunks.filter(c => c.type === 'text').map(c => c.content).join('')).toMatch(/^Hello$/)
    const usage = chunks.filter(c => c.type === 'usage')
    expect(usage).toHaveLength(1)
    expect(usage[0].usage).toMatchObject({ promptTokens: 1000, completionTokens: 500, totalTokens: 1500 })
    expect(usage[0].metadata?.costUsd).toBeCloseTo(0.0105, 8)
    expect(onUsage).toHaveBeenCalledWith(expect.objectContaining({ provider, model: 'm', costUsd: expect.closeTo(0.0105, 8) }))
  })

  it('omits costUsd without pricing', async () => {
    const chunks = await collect(createModelGateway({ provider: 'openai', model: 'm', apiKey: 'k', fetch: recorded('openai') }))
    expect(chunks.find(c => c.type === 'usage')?.metadata?.costUsd).toBeUndefined()
  })
})

describe('createModelGateway — ceilings', () => {
  it('refuses a call whose actual cost exceeds maxCostUsd', async () => {
    const gw = createModelGateway({ provider: 'openai', model: 'm', apiKey: 'k', pricing, maxCostUsd: 0.005, fetch: recorded('openai') })
    await expect(collect(gw)).rejects.toMatchObject({ name: 'BudgetExceededError', scope: 'call', limitUsd: 0.005 })
  })

  it('refuses before any network call when the worst case exceeds the cap', async () => {
    const fetch = recorded('openai')
    const gw = createModelGateway({ provider: 'openai', model: 'm', apiKey: 'k', pricing, maxCostUsd: 0.001, maxTokens: 4096, fetch })
    await expect(collect(gw)).rejects.toBeInstanceOf(BudgetExceededError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('charges a named budget and refuses once it is spent', async () => {
    const acme = createCostBudget('client:acme', 0.02)
    const mk = () => createModelGateway({ provider: 'anthropic', model: 'm', apiKey: 'k', pricing, budget: acme, fetch: recorded('anthropic') })
    await collect(mk())
    expect(acme.spentUsd).toBeCloseTo(0.0105, 8)
    await collect(mk()) // 0.021 > 0.02 → this call is refused after it ran
      .then(() => { throw new Error('expected refusal') }, (e: unknown) => {
        expect(e).toMatchObject({ scope: 'budget', budget: 'client:acme' })
      })
    const fetch = recorded('anthropic')
    const err = await collect(createModelGateway({ provider: 'anthropic', model: 'm', apiKey: 'k', pricing, budget: acme, fetch })).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(BudgetExceededError)
    expect(fetch).not.toHaveBeenCalled()
    expect((err as BudgetExceededError).code).toBe('AK_BUDGET_EXCEEDED')
  })

  it('keeps budgets independent per client', async () => {
    const a = createCostBudget('a', 1)
    const b = createCostBudget('b', 1)
    await collect(createModelGateway({ provider: 'openrouter', model: 'm', apiKey: 'k', pricing, budget: a, fetch: recorded('openrouter') }))
    expect(a.spentUsd).toBeGreaterThan(0)
    expect(b.spentUsd).toBe(0)
  })

  it('requires pricing when a ceiling is set', () => {
    expect(() => createModelGateway({ provider: 'openai', model: 'm', apiKey: 'k', maxCostUsd: 1 })).toThrow(/pricing/)
  })
})
