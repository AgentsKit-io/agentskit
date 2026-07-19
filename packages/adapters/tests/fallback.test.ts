import { describe, expect, it } from 'vitest'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { createFallbackAdapter } from '../src/fallback'

function req(): AdapterRequest {
  return { messages: [{ id: '1', role: 'user', content: 'x', status: 'complete', createdAt: new Date(0) }] }
}

function ok(text: string): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        yield { type: 'text', content: text } as StreamChunk
        yield { type: 'done' } as StreamChunk
      },
    }),
  }
}

function throwsOnOpen(): AdapterFactory {
  return {
    createSource: () => {
      throw new Error('cannot open')
    },
  }
}

function throwsOnFirst(): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        throw new Error('explodes before first chunk')
      },
    }),
  }
}

function emitsNone(): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        // yields nothing
      },
    }),
  }
}

/** Surfaces a provider failure (e.g. 404/429) as a leading `error` chunk. */
function errorsOnFirst(msg: string): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        yield { type: 'error', content: msg } as StreamChunk
      },
    }),
  }
}

async function collect(factory: AdapterFactory): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of factory.createSource(req()).stream()) out.push(c)
  return out
}

describe('createFallbackAdapter', () => {
  it('rejects empty candidate list', () => {
    expect(() => createFallbackAdapter([])).toThrow(/at least one candidate/)
  })

  it('uses the first candidate when it succeeds', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: ok('A') },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('A')
  })

  it('falls through when createSource throws', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: throwsOnOpen() },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('B')
  })

  it('falls through when first chunk throws', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: throwsOnFirst() },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('B')
  })

  it('falls through when a candidate emits zero chunks', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: emitsNone() },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('B')
  })

  it('falls through when a candidate emits a leading error chunk', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: errorsOnFirst('OpenAI API error: 404') },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('B')
  })

  it('falls through when leading usage is followed by an error', async () => {
    const usageThenError: AdapterFactory = {
      createSource: () => ({
        abort: () => {},
        stream: async function* () {
          yield { type: 'usage', usage: { inputTokens: 1, outputTokens: 0 } } as StreamChunk
          yield { type: 'error', content: 'failed before content' } as StreamChunk
        },
      }),
    }
    const f = createFallbackAdapter([
      { id: 'a', adapter: usageThenError },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks.map(chunk => chunk.type)).toEqual(['text', 'done'])
    expect(chunks[0]!.content).toBe('B')
  })

  it('cascades across several failing free models to the first healthy one', async () => {
    const f = createFallbackAdapter([
      { id: 'm1', adapter: errorsOnFirst('429 rate-limited') },
      { id: 'm2', adapter: errorsOnFirst('404 stale model') },
      { id: 'm3', adapter: throwsOnOpen() },
      { id: 'm4', adapter: ok('M4') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('M4')
  })

  it('an error chunk *after* a candidate commits is propagated, not retried', async () => {
    const lateError: AdapterFactory = {
      createSource: () => ({
        abort: () => {},
        stream: async function* () {
          yield { type: 'text', content: 'hi' } as StreamChunk
          yield { type: 'error', content: 'boom' } as StreamChunk
        },
      }),
    }
    const f = createFallbackAdapter([
      { id: 'a', adapter: lateError },
      { id: 'b', adapter: ok('B') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]!.content).toBe('hi')
    expect(chunks.some((c) => c.type === 'error')).toBe(true)
  })

  it('aggregates errors when every candidate fails', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: throwsOnOpen() },
      { id: 'b', adapter: throwsOnFirst() },
    ])
    // ADR 0001 A9 — composition adapters report terminal failure as an error
    // chunk, never by rejecting the stream iterator.
    let rejected: unknown
    let chunks: StreamChunk[] = []
    try {
      chunks = await collect(f)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect((err!.metadata?.error as Error).message).toMatch(/all fallback candidates failed.*a:.*b:/)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('onFallback observes each hop', async () => {
    const hops: string[] = []
    const f = createFallbackAdapter(
      [
        { id: 'a', adapter: throwsOnOpen() },
        { id: 'b', adapter: ok('B') },
      ],
      { onFallback: x => hops.push(`${x.id}@${x.index}:${x.error.message}`) },
    )
    await collect(f)
    expect(hops[0]).toMatch(/^a@0:cannot open/)
  })

  it('shouldRetry=false stops the chain with a terminal error chunk', async () => {
    const f = createFallbackAdapter(
      [
        { id: 'a', adapter: throwsOnOpen() },
        { id: 'b', adapter: ok('B') },
      ],
      { shouldRetry: () => false },
    )
    // ADR 0001 A9 — shouldRetry=false is still a stream-visible failure.
    let rejected: unknown
    let chunks: StreamChunk[] = []
    try {
      chunks = await collect(f)
    } catch (err) {
      rejected = err
    }
    expect(rejected).toBeUndefined()
    const err = chunks.find(c => c.type === 'error')
    expect(err).toBeDefined()
    expect(err!.metadata?.error).toBeInstanceOf(Error)
    expect((err!.metadata?.error as Error).message).toMatch(/cannot open/)
    expect(chunks.some(c => c.type === 'done')).toBe(false)
  })

  it('committed candidate normalizes mid-stream throws without retrying', async () => {
    const flaky: AdapterFactory = {
      createSource: () => ({
        abort: () => {},
        stream: async function* () {
          yield { type: 'text', content: 'partial' } as StreamChunk
          throw new Error('mid-stream')
        },
      }),
    }
    const f = createFallbackAdapter([
      { id: 'flaky', adapter: flaky },
      { id: 'backup', adapter: ok('backup') },
    ])
    const chunks = await collect(f)
    expect(chunks[0]?.content).toBe('partial')
    expect(chunks[1]?.type).toBe('error')
    expect(chunks[1]?.metadata?.error).toBeInstanceOf(Error)
    expect((chunks[1]?.metadata?.error as Error).message).toMatch(/mid-stream/)
    expect(chunks.some(chunk => chunk.content === 'backup')).toBe(false)
  })

  it('abort stops further fallthrough', async () => {
    const f = createFallbackAdapter([
      { id: 'a', adapter: throwsOnOpen() },
      { id: 'b', adapter: ok('B') },
    ])
    const source = f.createSource(req())
    source.abort()
    const out: StreamChunk[] = []
    for await (const c of source.stream()) out.push(c)
    expect(out).toHaveLength(0)
  })
})
