import { describe, expect, it } from 'vitest'
import { NetErrorCodes } from '../src/errors'
import { readBody, readJson, readText } from '../src/body'

function streamOf(chunks: string[], headers: Record<string, string> = {}): { response: Response; cancelled: () => boolean } {
  let cancelled = false
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = chunks.shift()
      if (next === undefined) controller.close()
      else controller.enqueue(encoder.encode(next))
    },
    cancel() {
      cancelled = true
    },
  })
  return { response: new Response(body, { headers }), cancelled: () => cancelled }
}

describe('readBody', () => {
  it('reads bodies within the limit', async () => {
    expect(await readText(new Response('hello'), { maxBytes: 5 })).toBe('hello')
    expect(await readJson(new Response('{"a":1}'), { maxBytes: 100 })).toEqual({ a: 1 })
    expect((await readBody(new Response(null), { maxBytes: 0 })).byteLength).toBe(0)
  })

  it('rejects a declared Content-Length over the limit without reading', async () => {
    const { response, cancelled } = streamOf(['x'], { 'content-length': '1000' })
    await expect(readBody(response, { maxBytes: 10 })).rejects.toMatchObject({ code: NetErrorCodes.AK_NET_BODY_TOO_LARGE })
    await Promise.resolve()
    expect(cancelled()).toBe(true)
  })

  it('counts streamed bytes and cancels on overflow', async () => {
    const { response, cancelled } = streamOf(['12345', '67890', 'never read'])
    await expect(readBody(response, { maxBytes: 8 })).rejects.toMatchObject({ code: NetErrorCodes.AK_NET_BODY_TOO_LARGE })
    expect(cancelled()).toBe(true)
  })

  it('validates maxBytes', async () => {
    await expect(readBody(new Response('x'), { maxBytes: -1 })).rejects.toThrow(/maxBytes/)
  })
})
