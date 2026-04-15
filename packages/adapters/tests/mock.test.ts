import { describe, it, expect } from 'vitest'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'
import {
  mockAdapter,
  recordingAdapter,
  replayAdapter,
  inMemorySink,
} from '../src/mock'

const sampleRequest: AdapterRequest = {
  messages: [
    {
      id: '1',
      role: 'user',
      content: 'hi',
      status: 'complete',
      createdAt: new Date('2026-04-15T00:00:00Z'),
    },
  ],
}

async function collect(source: ReturnType<ReturnType<typeof mockAdapter>['createSource']>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of source.stream()) out.push(chunk)
  return out
}

describe('mockAdapter — static response', () => {
  it('yields the chunks in order', async () => {
    const adapter = mockAdapter({
      response: [
        { type: 'text', content: 'hello' },
        { type: 'text', content: ' world' },
        { type: 'done' },
      ],
    })

    const chunks = await collect(adapter.createSource(sampleRequest))
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toEqual({ type: 'text', content: 'hello' })
    expect(chunks[1]).toEqual({ type: 'text', content: ' world' })
    expect(chunks[2]).toEqual({ type: 'done' })
  })

  it('appends a done chunk if the response did not include one', async () => {
    const adapter = mockAdapter({
      response: [{ type: 'text', content: 'hi' }],
    })

    const chunks = await collect(adapter.createSource(sampleRequest))
    expect(chunks).toEqual([
      { type: 'text', content: 'hi' },
      { type: 'done' },
    ])
  })

  it('does not duplicate done if response already terminates', async () => {
    const adapter = mockAdapter({
      response: [{ type: 'done' }],
    })
    const chunks = await collect(adapter.createSource(sampleRequest))
    expect(chunks).toEqual([{ type: 'done' }])
  })

  it('terminates with error and does not append done', async () => {
    const adapter = mockAdapter({
      response: [{ type: 'error', content: 'kaboom' }],
    })
    const chunks = await collect(adapter.createSource(sampleRequest))
    expect(chunks).toEqual([{ type: 'error', content: 'kaboom' }])
  })

  it('does not start work until stream() is called (ADR 0001 A1)', () => {
    let started = false
    const adapter = mockAdapter({
      response: () => {
        started = true
        return [{ type: 'done' }]
      },
    })
    adapter.createSource(sampleRequest)
    expect(started).toBe(false)
  })

  it('records request history when sink is supplied', () => {
    const history: AdapterRequest[] = []
    const adapter = mockAdapter({
      response: [{ type: 'done' }],
      history,
    })
    adapter.createSource(sampleRequest)
    adapter.createSource(sampleRequest)
    expect(history).toHaveLength(2)
  })
})

describe('mockAdapter — request-aware', () => {
  it('passes the request to the response function', async () => {
    const adapter = mockAdapter({
      response: req => [
        { type: 'text', content: 'echo: ' + req.messages[0].content },
        { type: 'done' },
      ],
    })
    const chunks = await collect(adapter.createSource(sampleRequest))
    expect(chunks[0]).toEqual({ type: 'text', content: 'echo: hi' })
  })
})

describe('mockAdapter — sequenced', () => {
  it('returns each item per call, looping when exhausted', async () => {
    const adapter = mockAdapter({
      response: [
        [{ type: 'text', content: 'first' }, { type: 'done' }],
        [{ type: 'text', content: 'second' }, { type: 'done' }],
      ],
    })

    const a = await collect(adapter.createSource(sampleRequest))
    const b = await collect(adapter.createSource(sampleRequest))
    const c = await collect(adapter.createSource(sampleRequest))   // loops back to first

    expect(a[0]).toEqual({ type: 'text', content: 'first' })
    expect(b[0]).toEqual({ type: 'text', content: 'second' })
    expect(c[0]).toEqual({ type: 'text', content: 'first' })
  })
})

describe('mockAdapter — abort', () => {
  it('stops yielding chunks after abort', async () => {
    const adapter = mockAdapter({
      response: [
        { type: 'text', content: 'a' },
        { type: 'text', content: 'b' },
        { type: 'text', content: 'c' },
        { type: 'done' },
      ],
      delayMs: 5,
    })

    const source = adapter.createSource(sampleRequest)
    const chunks: StreamChunk[] = []
    const reader = (async () => {
      for await (const chunk of source.stream()) chunks.push(chunk)
    })()

    await new Promise(r => setTimeout(r, 8))
    source.abort()
    await reader

    expect(chunks.length).toBeLessThan(4)
  })
})

describe('recordingAdapter + replayAdapter', () => {
  it('records every chunk an inner adapter yields', async () => {
    const inner = mockAdapter({
      response: [
        { type: 'text', content: 'recorded' },
        { type: 'done' },
      ],
    })
    const sink = inMemorySink()
    const wrapped = recordingAdapter(inner, sink)

    const source = wrapped.createSource(sampleRequest)
    for await (const _ of source.stream()) { /* drain */ }

    expect(sink.fixture).toHaveLength(1)
    expect(sink.fixture[0].chunks).toHaveLength(2)
    expect(sink.fixture[0].request).toBe(sampleRequest)
    expect(sink.fixture[0].recordedAt).toBeTruthy()
  })

  it('replays a recorded fixture deterministically', async () => {
    const sink = inMemorySink()
    const recordedInner = mockAdapter({
      response: [
        [{ type: 'text', content: 'turn1' }, { type: 'done' }],
        [{ type: 'text', content: 'turn2' }, { type: 'done' }],
      ],
    })
    const wrapped = recordingAdapter(recordedInner, sink)

    // Record two turns
    for await (const _ of wrapped.createSource(sampleRequest).stream()) {}
    for await (const _ of wrapped.createSource(sampleRequest).stream()) {}

    expect(sink.fixture).toHaveLength(2)

    // Replay
    const replay = replayAdapter(sink.fixture)
    const a = await collect(replay.createSource(sampleRequest))
    const b = await collect(replay.createSource(sampleRequest))

    expect(a[0]).toEqual({ type: 'text', content: 'turn1' })
    expect(b[0]).toEqual({ type: 'text', content: 'turn2' })
  })

  it('replayAdapter throws on empty fixture', () => {
    expect(() => replayAdapter([])).toThrow(/empty/)
  })
})
