import { describe, expect, it } from 'vitest'
import type { StreamChunk } from '@agentskit/core'
import { parseOpenAIStream } from '../src/openai-stream'

function stream(lines: string[]): ReadableStream {
  const body = lines.map((line) => `data: ${line}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  })
}

async function collect(source: AsyncIterableIterator<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of source) chunks.push(chunk)
  return chunks
}

describe('parseOpenAIStream terminal integrity', () => {
  it('accepts a canonical done sentinel', async () => {
    await expect(collect(parseOpenAIStream(stream(['[DONE]'])))).resolves.toEqual([{ type: 'done' }])
  })

  it('rejects an unknown finish reason', async () => {
    const chunks = await collect(parseOpenAIStream(stream([
      JSON.stringify({ choices: [{ delta: {}, finish_reason: 'cancelled' }] }),
      '[DONE]',
    ])))

    expect(chunks.at(-1)?.type).toBe('error')
    expect(chunks.at(-1)?.metadata?.finishReason).toBe('cancelled')
  })
})
