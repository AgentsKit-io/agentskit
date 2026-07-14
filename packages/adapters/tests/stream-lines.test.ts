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

async function collect(source: AsyncIterableIterator<string>): Promise<string[]> {
  const lines: string[] = []
  for await (const line of source) lines.push(line)
  return lines
}

describe('stream line readers', () => {
  it('reads SSE records split across transport chunks', async () => {
    await expect(collect(readSSELines(stream(['data: hel', 'lo\n\ndata: world\n\n']))))
      .resolves.toEqual(['hello', 'world'])
  })

  it('reads non-empty NDJSON records', async () => {
    await expect(collect(readNDJSONLines(stream(['{"a":1}\n', '\n{"b":2}\n']))))
      .resolves.toEqual(['{"a":1}', '{"b":2}'])
  })
})
