import { describe, it, expect } from 'vitest'
import { generic } from '../src/generic'

describe('generic adapter', () => {
  it('converts a ReadableStream from send() into StreamChunks', async () => {
    const encoder = new TextEncoder()
    const adapter = generic({
      send: async (_request: { messages: unknown[] }) => {
        return new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('Hello'))
            controller.enqueue(encoder.encode(' world'))
            controller.close()
          },
        })
      },
    })

    const source = adapter.createSource({ messages: [] })
    const chunks: Array<{ type: string; content?: string }> = []
    for await (const chunk of source.stream()) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ])
  })

  it('yields error chunk when send() throws', async () => {
    const adapter = generic({
      send: async () => { throw new Error('network failure') },
    })

    const source = adapter.createSource({ messages: [] })
    const chunks: Array<{ type: string; content?: string }> = []
    for await (const chunk of source.stream()) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: 'network failure' })
    expect((chunks[0] as { metadata?: { error?: unknown } }).metadata?.error).toBeInstanceOf(Error)
  })

  it('pre-abort yields nothing', async () => {
    const adapter = generic({
      send: async () =>
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('x'))
            c.close()
          },
        }),
    })
    const source = adapter.createSource({ messages: [] })
    source.abort()
    const out: unknown[] = []
    for await (const c of source.stream()) out.push(c)
    expect(out).toEqual([])
  })

  it('abort during pending send terminates quietly', async () => {
    let resolveSend!: (v: ReadableStream) => void
    const adapter = generic({
      send: () =>
        new Promise<ReadableStream>(resolve => {
          resolveSend = resolve
        }),
    })
    const source = adapter.createSource({ messages: [] })
    const iter = source.stream()[Symbol.asyncIterator]()
    const pending = iter.next()
    source.abort()
    resolveSend(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('late'))
          c.close()
        },
      }),
    )
    const first = await pending
    expect(first.done).toBe(true)
  })

  it('passes optional AbortSignal as second send argument', async () => {
    let seen: AbortSignal | undefined
    const adapter = generic({
      send: async (_req, signal) => {
        seen = signal
        return new ReadableStream({
          start(c) {
            c.close()
          },
        })
      },
    })
    for await (const _ of adapter.createSource({ messages: [] }).stream()) void _
    expect(seen).toBeInstanceOf(AbortSignal)
  })
})
