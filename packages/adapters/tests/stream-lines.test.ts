import { describe, expect, it } from 'vitest'
import { readNDJSONLines, readSSELines } from '../src/stream-lines'

function stream(chunks: string[]): ReadableStream {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

function byteStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

async function collect(source: AsyncIterableIterator<string>): Promise<string[]> {
  const lines: string[] = []
  for await (const line of source) lines.push(line)
  return lines
}

describe('stream line readers', () => {
  it('delegates SSE events with no-space data, multiline fields, line endings, and whitespace intact', async () => {
    const body = 'data:no-space\r\n\r\ndata: first\ndata: second\r\rdata:  spaced  \n\n'
    await expect(collect(readSSELines(stream([body]))))
      .resolves.toEqual(['no-space', 'first\nsecond', ' spaced  '])
    await expect(collect(readSSELines(stream(['data: hel', 'lo\n\n']))))
      .resolves.toEqual(['hello'])
  })

  it('decodes split UTF-8 SSE bytes and drops events without a terminating blank line', async () => {
    const bytes = new TextEncoder().encode('data: snow ☃\n\n' + 'data: unfinished')
    const snowman = new TextEncoder().encode('☃')
    const position = bytes.findIndex((byte, index) => byte === snowman[0] && bytes[index + 1] === snowman[1])
    await expect(collect(readSSELines(byteStream([
      bytes.slice(0, position + 1),
      bytes.slice(position + 1, position + 2),
      bytes.slice(position + 2),
    ])))).resolves.toEqual(['snow ☃'])
  })

  it('reads non-empty NDJSON records', async () => {
    await expect(collect(readNDJSONLines(stream(['{"a":1}\n', '\n{"b":2}\n']))))
      .resolves.toEqual(['{"a":1}', '{"b":2}'])
  })

  it('flushes split UTF-8 and yields the final NDJSON record without a newline', async () => {
    const bytes = new TextEncoder().encode('{"value":"☃"}\r\n{"tail":"last ☃"}')
    const snowman = new TextEncoder().encode('☃')
    const first = bytes.findIndex((byte, index) => byte === snowman[0] && bytes[index + 1] === snowman[1])
    const second = bytes.findIndex((byte, index) => index > first && byte === snowman[0] && bytes[index + 1] === snowman[1])
    await expect(collect(readNDJSONLines(byteStream([
      bytes.slice(0, first + 1),
      bytes.slice(first + 1, first + 2),
      bytes.slice(first + 2, second + 1),
      bytes.slice(second + 1, second + 2),
      bytes.slice(second + 2),
    ])))).resolves.toEqual(['{"value":"☃"}', '{"tail":"last ☃"}'])
  })

  it('flushes an incomplete final UTF-8 code point using TextDecoder replacement', async () => {
    const prefix = new TextEncoder().encode('tail:')
    const unfinishedBytes = Uint8Array.from([...prefix, 0xe2, 0x82])
    await expect(collect(readNDJSONLines(byteStream([unfinishedBytes]))))
      .resolves.toEqual(['tail:�'])
  })
})
