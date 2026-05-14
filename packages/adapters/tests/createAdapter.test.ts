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
    expect(out).toEqual([{ type: 'error', content: 'boom' }])
  })

  it('error chunk uses String(err) when error is not an Error instance', async () => {
    const send = vi.fn().mockRejectedValue('nope')
    const parse = vi.fn(async function* () {})
    const adapter = createAdapter({ send, parse })
    const out: unknown[] = []
    for await (const c of adapter.createSource({ messages: [] }).stream()) {
      out.push(c)
    }
    expect(out).toEqual([{ type: 'error', content: 'nope' }])
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
})
