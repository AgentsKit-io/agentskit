import { describe, expect, it } from 'vitest'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { createEnsembleAdapter } from '../src/ensemble'

function adapter(chunks: StreamChunk[], opts: { delayMs?: number; throwImmediately?: boolean } = {}): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        if (opts.throwImmediately) throw new Error('boom')
        for (const c of chunks) {
          if (opts.delayMs !== undefined) await new Promise(r => setTimeout(r, opts.delayMs))
          yield c
        }
      },
    }),
  }
}

function textOnly(text: string): AdapterFactory {
  return adapter([{ type: 'text', content: text }, { type: 'done' }])
}

function req(): AdapterRequest {
  return {
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
  }
}

async function collect(factory: AdapterFactory): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of factory.createSource(req()).stream()) out.push(c)
  return out
}

describe('createEnsembleAdapter', () => {
  it('rejects empty candidate list', () => {
    expect(() => createEnsembleAdapter({ candidates: [] })).toThrow(/at least one candidate/)
  })

  it('majority-vote default picks the most popular text', async () => {
    const ens = createEnsembleAdapter({
      candidates: [
        { id: 'a', adapter: textOnly('yes') },
        { id: 'b', adapter: textOnly('yes') },
        { id: 'c', adapter: textOnly('no') },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toBe('yes')
    expect(chunks[chunks.length - 1]!.type).toBe('done')
  })

  it('weighted vote respects weights', async () => {
    const ens = createEnsembleAdapter({
      candidates: [
        { id: 'a', adapter: textOnly('cheap'), weight: 1 },
        { id: 'b', adapter: textOnly('premium'), weight: 10 },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toBe('premium')
  })

  it('concat aggregator joins branches with separator', async () => {
    const ens = createEnsembleAdapter({
      aggregate: 'concat',
      candidates: [
        { id: 'a', adapter: textOnly('hello') },
        { id: 'b', adapter: textOnly('world') },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toContain('hello')
    expect(chunks[0]!.content).toContain('---')
    expect(chunks[0]!.content).toContain('world')
  })

  it('longest aggregator picks the longest branch', async () => {
    const ens = createEnsembleAdapter({
      aggregate: 'longest',
      candidates: [
        { id: 'a', adapter: textOnly('short') },
        { id: 'b', adapter: textOnly('a much longer reply') },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toBe('a much longer reply')
  })

  it('custom aggregator receives branch results', async () => {
    const ens = createEnsembleAdapter({
      aggregate: branches => branches.map(b => `${b.id}:${b.text}`).join('|'),
      candidates: [
        { id: 'a', adapter: textOnly('x') },
        { id: 'b', adapter: textOnly('y') },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toBe('a:x|b:y')
  })

  it('onBranches fires with per-branch results', async () => {
    let seen: { id: string; text: string }[] = []
    const ens = createEnsembleAdapter({
      onBranches: b => {
        seen = b.map(x => ({ id: x.id, text: x.text }))
      },
      candidates: [
        { id: 'a', adapter: textOnly('x') },
        { id: 'b', adapter: textOnly('y') },
      ],
    })
    await collect(ens)
    expect(seen.map(s => s.id)).toEqual(['a', 'b'])
  })

  it('tolerates one failing branch', async () => {
    const ens = createEnsembleAdapter({
      candidates: [
        { id: 'bad', adapter: adapter([], { throwImmediately: true }) },
        { id: 'ok', adapter: textOnly('hi') },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toBe('hi')
  })

  it('yields terminal error chunk when every branch fails', async () => {
    const ens = createEnsembleAdapter({
      candidates: [
        { id: 'a', adapter: adapter([], { throwImmediately: true }) },
        { id: 'b', adapter: adapter([], { throwImmediately: true }) },
      ],
    })
    // ADR 0001 A9 — all-fail must not reject the stream iterator.
    let rejected: unknown
    let chunks: StreamChunk[] = []
    try {
      chunks = await collect(ens)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect((err!.metadata?.error as Error).message).toMatch(/all ensemble branches failed/)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('yields terminal error chunk when createSource throws on a branch and all fail', async () => {
    const boomOnCreate: AdapterFactory = {
      createSource: () => {
        throw new Error('cannot construct source')
      },
    }
    const ens = createEnsembleAdapter({
      candidates: [
        { id: 'a', adapter: boomOnCreate },
        { id: 'b', adapter: boomOnCreate },
      ],
    })
    let rejected: unknown
    let chunks: StreamChunk[] = []
    try {
      chunks = await collect(ens)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('yields terminal error chunk when custom aggregate throws', async () => {
    const ens = createEnsembleAdapter({
      aggregate: () => {
        throw new Error('aggregate exploded')
      },
      candidates: [
        { id: 'a', adapter: textOnly('x') },
        { id: 'b', adapter: textOnly('y') },
      ],
    })
    let rejected: unknown
    let chunks: StreamChunk[] = []
    try {
      chunks = await collect(ens)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect((err!.metadata?.error as Error).message).toMatch(/aggregate exploded/)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('timeoutMs marks slow branches as errors', async () => {
    const seen: { id: string; error?: string }[] = []
    const ens = createEnsembleAdapter({
      timeoutMs: 5,
      onBranches: b => {
        seen.push(...b.map(x => ({ id: x.id, error: x.error?.message })))
      },
      candidates: [
        { id: 'slow', adapter: adapter([{ type: 'text', content: 'late' }, { type: 'done' }], { delayMs: 100 }) },
        { id: 'fast', adapter: textOnly('quick') },
      ],
    })
    const chunks = await collect(ens)
    expect(chunks[0]!.content).toBe('quick')
    expect(seen.find(s => s.id === 'slow')!.error).toMatch(/timeout|aborted/i)
  })

  it('abort cancels all running sources', async () => {
    const ens = createEnsembleAdapter({
      candidates: [
        { id: 'a', adapter: adapter([{ type: 'text', content: 'x' }, { type: 'done' }], { delayMs: 50 }) },
      ],
    })
    const source = ens.createSource(req())
    source.abort()
    const chunks: StreamChunk[] = []
    for await (const c of source.stream()) chunks.push(c)
    expect(chunks).toHaveLength(0)
  })
})
