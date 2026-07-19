import { describe, expect, it } from 'vitest'
import { createStreamSource } from '../src/stream-source'

describe('createStreamSource', () => {
  it('reports an empty response body as a terminal error', async () => {
    const source = createStreamSource(
      async () => new Response(null, { status: 200 }),
      async function* () {},
      'Provider',
      { maxAttempts: 1 },
    )
    const chunks = []
    for await (const chunk of source.stream()) chunks.push(chunk)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error' })
    expect(chunks[0]?.metadata?.error).toBeInstanceOf(Error)
  })
})
