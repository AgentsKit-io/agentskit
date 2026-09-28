import { describe, expect, it } from 'vitest'
import { parseSSE, parseSSEResponse } from '../src/sse'

function stream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function collect(source: AsyncIterable<{ data: string; event?: string; id?: string }>) {
  const out: Array<{ data: string; event?: string; id?: string }> = []
  for await (const event of source) out.push({ data: event.data, event: event.event, id: event.id })
  return out
}

describe('parseSSE', () => {
  it('handles data with and without a space, multi-line data and fields', async () => {
    const events = await collect(parseSSE(stream('data:no-space\n\n', 'event: delta\nid: 7\ndata: line 1\ndata: line 2\n\n')))
    expect(events).toEqual([
      { data: 'no-space', event: undefined, id: undefined },
      { data: 'line 1\nline 2', event: 'delta', id: '7' },
    ])
  })

  it('reassembles events split across chunks, UTF-8 sequences and CRLF', async () => {
    const bytes = new TextEncoder().encode('data: olá ✓\r\n\r\n')
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]))
        controller.close()
      },
    })
    expect(await collect(parseSSE(source))).toEqual([{ data: 'olá ✓', event: undefined, id: undefined }])
  })

  it('ignores comments and drops an event cut off before its blank line', async () => {
    expect(await collect(parseSSE(stream(': keep-alive\n\n', 'data: done\n\n', 'data: partial')))).toEqual([
      { data: 'done', event: undefined, id: undefined },
    ])
  })

  it('fails with a typed error when one event exceeds the buffer cap', async () => {
    await expect(collect(parseSSE(stream(`data: ${'x'.repeat(200)}`), { maxEventBytes: 64 }))).rejects.toMatchObject({
      code: 'AK_NET_SSE_PARSE_FAILED',
    })
  })

  it('stops when the signal aborts', async () => {
    const controller = new AbortController()
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: first\n\n'))
      },
    })
    const iterator = parseSSE(source, { signal: controller.signal })
    expect((await iterator.next()).value?.data).toBe('first')
    controller.abort(new Error('closed by user'))
    await expect(iterator.next()).rejects.toBeDefined()
  })

  it('reads a fetch response body', async () => {
    expect(await collect(parseSSEResponse(new Response('data: hi\n\n')))).toEqual([{ data: 'hi', event: undefined, id: undefined }])
    expect(await collect(parseSSEResponse(new Response(null)))).toEqual([])
  })
})
