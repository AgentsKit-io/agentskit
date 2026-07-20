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

  it('async policy unknown id yields terminal error chunk, never rejects', async () => {
    const router = createRouter({
      policy: async () => 'nope',
      candidates: [{ id: 'a', adapter: fake('a') }],
    })
    const source = router.createSource(req('x'))
    const chunks: StreamChunk[] = []
    let rejected: unknown
    try {
      for await (const c of source.stream()) chunks.push(c)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect((err!.metadata?.error as Error).message).toMatch(/unknown id/)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('async policy rejection yields terminal error chunk, never rejects', async () => {
    const router = createRouter({
      policy: async () => {
        throw new Error('policy rejected')
      },
      candidates: [{ id: 'a', adapter: fake('a') }],
    })
    const source = router.createSource(req('x'))
    const chunks: StreamChunk[] = []
    let rejected: unknown
    try {
      for await (const c of source.stream()) chunks.push(c)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect((err!.metadata?.error as Error).message).toMatch(/policy rejected/)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('async policy normalizes child createSource failures', async () => {
    const router = createRouter({
      policy: async () => 'broken',
      candidates: [{
        id: 'broken',
        adapter: { createSource: () => { throw new Error('child construction failed') } },
      }],
    })
    const chunks: StreamChunk[] = []
    for await (const chunk of router.createSource(req('x')).stream()) chunks.push(chunk)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.type).toBe('error')
    expect(chunks[0]?.metadata?.error).toBeInstanceOf(Error)
    expect((chunks[0]?.metadata?.error as Error).message).toMatch(/child construction failed/)
  })

  it('async policy abort prevents selected child and emits nothing after abort', async () => {
    let childStarted = false
    let childAborted = false
    const slow: AdapterFactory = {
      createSource: () => ({
        abort: () => {
          childAborted = true
        },
        stream: async function* () {
          childStarted = true
          yield { type: 'text', content: 'slow-child' } as StreamChunk
          yield { type: 'done' } as StreamChunk
        },
      }),
    }

    let resolvePolicy: ((id: string) => void) | undefined
    const policyPromise = new Promise<string>(resolve => {
      resolvePolicy = resolve
    })

    const router = createRouter({
      policy: async () => policyPromise,
      candidates: [{ id: 'slow', adapter: slow }],
    })
    const source = router.createSource(req('x'))
    const iter = source.stream()[Symbol.asyncIterator]()

    // Abort while async policy is still pending — selected child must not run
    // (or must be aborted) and no chunks may arrive after the caller's abort.
    source.abort()
    resolvePolicy?.('slow')

    const afterAbort: StreamChunk[] = []
    let rejected: unknown
    try {
      while (true) {
        const next = await iter.next()
        if (next.done) break
        afterAbort.push(next.value)
      }
    } catch (err) {
      rejected = err
    }

    expect(rejected).toBeUndefined()
    expect(afterAbort).toEqual([])
    // Either the child never started, or it was aborted before emitting.
    expect(childStarted === false || childAborted === true).toBe(true)
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
