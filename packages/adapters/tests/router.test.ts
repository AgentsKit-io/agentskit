import { describe, expect, it } from 'vitest'
import type { AdapterCapabilities, AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { createRouter } from '../src/router'

function fake(id: string, capabilities?: AdapterCapabilities): AdapterFactory & { id: string } {
  return {
    id,
    capabilities,
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        yield { type: 'text', content: id } as StreamChunk
        yield { type: 'done' } as StreamChunk
      },
    }),
  }
}

function req(text: string, opts: { tools?: boolean } = {}): AdapterRequest {
  return {
    messages: [
      { id: '1', role: 'user', content: text, status: 'complete', createdAt: new Date(0) },
    ],
    context: opts.tools
      ? {
          tools: [{ name: 't', description: 'x', schema: { type: 'object' }, execute: async () => ({}) }],
        }
      : undefined,
  }
}

async function collect(factory: AdapterFactory, request: AdapterRequest): Promise<string[]> {
  const out: string[] = []
  for await (const c of factory.createSource(request).stream()) {
    if (c.type === 'text' && c.content) out.push(c.content)
  }
  return out
}

describe('createRouter', () => {
  it('rejects empty candidate list', () => {
    expect(() => createRouter({ candidates: [] })).toThrow(/at least one candidate/)
  })

  it('cheapest policy picks min cost', async () => {
    const router = createRouter({
      candidates: [
        { id: 'pricey', adapter: fake('pricey'), cost: 10 },
        { id: 'cheap', adapter: fake('cheap'), cost: 1 },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['cheap'])
  })

  it('fastest policy picks min latency', async () => {
    const router = createRouter({
      policy: 'fastest',
      candidates: [
        { id: 'slow', adapter: fake('slow'), latencyMs: 1000 },
        { id: 'quick', adapter: fake('quick'), latencyMs: 100 },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['quick'])
  })

  it('filters by required capabilities', async () => {
    const router = createRouter({
      candidates: [
        { id: 'plain', adapter: fake('plain', { tools: false }), cost: 1 },
        { id: 'tooly', adapter: fake('tooly', { tools: true }), cost: 5 },
      ],
    })
    expect(await collect(router, req('x', { tools: true }))).toEqual(['tooly'])
  })

  it('throws when no candidate can satisfy request', async () => {
    const router = createRouter({
      candidates: [{ id: 'plain', adapter: fake('plain', { tools: false }) }],
    })
    expect(() => router.createSource(req('x', { tools: true }))).toThrow(/no candidate satisfies/)
  })

  it('classify(id) short-circuits policy', async () => {
    const router = createRouter({
      classify: () => 'b',
      candidates: [
        { id: 'a', adapter: fake('a'), cost: 1 },
        { id: 'b', adapter: fake('b'), cost: 100 },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['b'])
  })

  it('classify(tags) filters then applies policy', async () => {
    const router = createRouter({
      classify: () => ['fast'],
      candidates: [
        { id: 'a', adapter: fake('a'), cost: 1, tags: ['slow'] },
        { id: 'b', adapter: fake('b'), cost: 5, tags: ['fast'] },
        { id: 'c', adapter: fake('c'), cost: 10, tags: ['fast'] },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['b'])
  })

  it('classify(unknown id) falls back to policy', async () => {
    const router = createRouter({
      classify: () => 'nope',
      candidates: [
        { id: 'cheap', adapter: fake('cheap'), cost: 1 },
        { id: 'pricey', adapter: fake('pricey'), cost: 5 },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['cheap'])
  })

  it('classify([]) has no effect', async () => {
    const router = createRouter({
      classify: () => [],
      candidates: [
        { id: 'cheap', adapter: fake('cheap'), cost: 1 },
        { id: 'pricey', adapter: fake('pricey'), cost: 5 },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['cheap'])
  })

  it('custom policy function', async () => {
    const router = createRouter({
      policy: ({ candidates }) => candidates[candidates.length - 1]!.id,
      candidates: [
        { id: 'a', adapter: fake('a') },
        { id: 'b', adapter: fake('b') },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['b'])
  })

  it('custom async policy', async () => {
    const router = createRouter({
      policy: async ({ candidates }) => {
        await new Promise(r => setTimeout(r, 5))
        return candidates[1]!.id
      },
      candidates: [
        { id: 'a', adapter: fake('a') },
        { id: 'b', adapter: fake('b') },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['b'])
  })

  it('custom policy unknown id throws', async () => {
    const router = createRouter({
      policy: () => 'nope',
      candidates: [{ id: 'a', adapter: fake('a') }],
    })
    expect(() => router.createSource(req('x'))).toThrow(/unknown id/)
  })

  it('onRoute fires with decision', async () => {
    const decisions: string[] = []
    const router = createRouter({
      onRoute: d => decisions.push(`${d.id}:${d.reason}`),
      candidates: [
        { id: 'a', adapter: fake('a'), cost: 1 },
        { id: 'b', adapter: fake('b'), cost: 5 },
      ],
    })
    await collect(router, req('x'))
    expect(decisions[0]).toBe('a:cheapest')
  })

  it('capability-match policy uses declared candidate caps', async () => {
    const router = createRouter({
      policy: 'capability-match',
      candidates: [
        { id: 'a', adapter: fake('a'), capabilities: { tools: true } },
        { id: 'b', adapter: fake('b'), capabilities: { tools: true } },
      ],
    })
    expect(await collect(router, req('x', { tools: true }))).toEqual(['a'])
  })

  it('filters candidates by required data region', async () => {
    const router = createRouter({
      region: 'eu',
      candidates: [
        { id: 'us-openai', adapter: fake('us-openai'), region: 'us', cost: 1 },
        { id: 'eu-azure', adapter: fake('eu-azure'), region: 'eu', cost: 5 },
      ],
    })
    expect(await collect(router, req('x'))).toEqual(['eu-azure'])
  })

  it('rejects startup routing when no candidate matches region', () => {
    const router = createRouter({
      region: 'eu',
      candidates: [{ id: 'us-openai', adapter: fake('us-openai'), region: 'us' }],
    })
    expect(() => router.createSource(req('x'))).toThrow(/required region: eu/)
  })

  it('supports dynamic region selection per request', async () => {
    const router = createRouter({
      regionOf: request => request.context?.metadata?.region as 'eu' | 'us' | undefined,
      candidates: [
        { id: 'us-openai', adapter: fake('us-openai'), region: 'us', cost: 1 },
        { id: 'eu-azure', adapter: fake('eu-azure'), region: 'eu', cost: 1 },
      ],
    })
    expect(
      await collect(router, {
        ...req('x'),
        context: { metadata: { region: 'eu' } },
      }),
    ).toEqual(['eu-azure'])
  })
})
