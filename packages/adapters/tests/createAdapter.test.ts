import { describe, it, expect, vi } from 'vitest'
import { createAdapter } from '../src/createAdapter'

describe('createAdapter', () => {
  it('creates an AdapterFactory from send/parse/abort functions', () => {
    const send = vi.fn().mockResolvedValue(new ReadableStream())
    const parse = vi.fn()
    const abort = vi.fn()

    const adapter = createAdapter({ send, parse, abort })
    expect(adapter).toHaveProperty('createSource')
    expect(typeof adapter.createSource).toBe('function')
  })

  it('createSource returns a StreamSource with stream and abort', () => {
    const send = vi.fn().mockResolvedValue(new ReadableStream())
    const parse = vi.fn(async function* () { yield { type: 'done' as const } })
    const abort = vi.fn()

    const adapter = createAdapter({ send, parse, abort })
    const source = adapter.createSource({ messages: [] })
    expect(typeof source.stream).toBe('function')
    expect(typeof source.abort).toBe('function')
  })

  it('stream yields parsed chunks when send returns a ReadableStream', async () => {
    const body = new ReadableStream()
    const send = vi.fn().mockResolvedValue(body)
    const parse = vi.fn(async function* (s: ReadableStream) {
      expect(s).toBe(body)
      yield { type: 'text' as const, content: 'a' }
      yield { type: 'done' as const }
    })
    const adapter = createAdapter({ send, parse })
    const source = adapter.createSource({ messages: [] })
    const out: unknown[] = []
    for await (const c of source.stream()) out.push(c)
    expect(out).toEqual([
      { type: 'text', content: 'a' },
      { type: 'done' },
    ])
  })

  it('stream unwraps Response.body when send returns a Response', async () => {
    const body = new ReadableStream()
    const response = new Response(body)
    const send = vi.fn().mockResolvedValue(response)
    const parse = vi.fn(async function* (s: ReadableStream) {
      expect(s).toBe(response.body)
      yield { type: 'done' as const }
    })
    const adapter = createAdapter({ send, parse })
    const out: unknown[] = []
    for await (const c of adapter.createSource({ messages: [] }).stream()) {
      out.push(c)
    }
    expect(out).toEqual([{ type: 'done' }])
  })

  it('stream yields an error chunk when send throws', async () => {
    const send = vi.fn().mockRejectedValue(new Error('boom'))
    const parse = vi.fn(async function* () {})
    const adapter = createAdapter({ send, parse })
    const out: unknown[] = []
    for await (const c of adapter.createSource({ messages: [] }).stream()) {
      out.push(c)
    }
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'error', content: 'boom' })
    expect((out[0] as { metadata?: { error?: unknown } }).metadata?.error).toBeInstanceOf(Error)
  })

  it('normalizes parsers that end without a terminal chunk', async () => {
    const adapter = createAdapter({
      send: vi.fn().mockResolvedValue(new ReadableStream()),
      parse: vi.fn(async function* () {
        yield { type: 'text' as const, content: 'partial' }
      }),
    })
    const out: Array<{ type: string; metadata?: { error?: unknown } }> = []
    for await (const chunk of adapter.createSource({ messages: [] }).stream()) out.push(chunk)
    expect(out.map(chunk => chunk.type)).toEqual(['text', 'error'])
    expect(out[1]?.metadata?.error).toBeInstanceOf(Error)
  })

  it('stops at the first terminal chunk', async () => {
    const adapter = createAdapter({
      send: vi.fn().mockResolvedValue(new ReadableStream()),
      parse: vi.fn(async function* () {
        yield { type: 'done' as const }
        yield { type: 'text' as const, content: 'after-terminal' }
      }),
    })
    const out: Array<{ type: string }> = []
    for await (const chunk of adapter.createSource({ messages: [] }).stream()) out.push(chunk)
    expect(out.map(chunk => chunk.type)).toEqual(['done'])
  })

  it('error chunk uses String(err) when error is not an Error instance', async () => {
    const send = vi.fn().mockRejectedValue('nope')
    const parse = vi.fn(async function* () {})
    const adapter = createAdapter({ send, parse })
    const out: unknown[] = []
    for await (const c of adapter.createSource({ messages: [] }).stream()) {
      out.push(c)
    }
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'error', content: 'nope' })
    expect((out[0] as { metadata?: { error?: unknown } }).metadata?.error).toBeInstanceOf(Error)
  })

  it('abort invokes the configured abort callback', () => {
    const abort = vi.fn()
    const adapter = createAdapter({
      send: vi.fn().mockResolvedValue(new ReadableStream()),
      parse: vi.fn(async function* () {}),
      abort,
    })
    adapter.createSource({ messages: [] }).abort()
    expect(abort).toHaveBeenCalledOnce()
  })

  it('abort is safe when no abort callback is configured', () => {
    const adapter = createAdapter({
      send: vi.fn().mockResolvedValue(new ReadableStream()),
      parse: vi.fn(async function* () {}),
    })
    expect(() => adapter.createSource({ messages: [] }).abort()).not.toThrow()
  })

  it('pre-abort prevents send from producing chunks', async () => {
    const send = vi.fn().mockResolvedValue(new ReadableStream())
    const parse = vi.fn(async function* () {
      yield { type: 'text' as const, content: 'nope' }
      yield { type: 'done' as const }
    })
    const adapter = createAdapter({ send, parse })
    const source = adapter.createSource({ messages: [] })
    source.abort()
    const out: unknown[] = []
    for await (const c of source.stream()) out.push(c)
    expect(out).toEqual([])
  })

  it('abort during pending send terminates quietly without unhandled rejection', async () => {
    let resolveSend!: (v: ReadableStream) => void
    const send = vi.fn(
      () =>
        new Promise<ReadableStream>(resolve => {
          resolveSend = resolve
        }),
    )
    const parse = vi.fn(async function* () {
      yield { type: 'text' as const, content: 'late' }
      yield { type: 'done' as const }
    })
    const adapter = createAdapter({ send, parse })
    const source = adapter.createSource({ messages: [] })
    const iter = source.stream()[Symbol.asyncIterator]()
    const pending = iter.next()
    source.abort()
    resolveSend(new ReadableStream({ start(c) { c.close() } }))
    const first = await pending
    expect(first.done).toBe(true)
  })

  it('abort mid-parse stops further chunks and calls configured abort', async () => {
    const abort = vi.fn()
    let release!: () => void
    const gate = new Promise<void>(r => {
      release = r
    })
    const parse = vi.fn(async function* () {
      yield { type: 'text' as const, content: 'a' }
      await gate
      yield { type: 'text' as const, content: 'b' }
      yield { type: 'done' as const }
    })
    const adapter = createAdapter({
      send: vi.fn().mockResolvedValue(new ReadableStream()),
      parse,
      abort,
    })
    const source = adapter.createSource({ messages: [] })
    const iter = source.stream()[Symbol.asyncIterator]()
    const first = await iter.next()
    expect(first.value).toMatchObject({ type: 'text', content: 'a' })
    source.abort()
    release()
    const after: unknown[] = []
    while (true) {
      const n = await iter.next()
      if (n.done) break
      after.push(n.value)
    }
    expect(after).toEqual([])
    expect(abort).toHaveBeenCalled()
  })
})
