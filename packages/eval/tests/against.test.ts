import { describe, expect, it } from 'vitest'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import {
  createCassette,
  replayAgainst,
  summarizeReplay,
  type Cassette,
} from '../src/replay'

function req(text: string): AdapterRequest {
  return {
    messages: [
      { id: '1', role: 'user', content: text, status: 'complete', createdAt: new Date(0) },
    ],
  }
}

function buildCassette(pairs: Array<{ input: string; output: string }>): Cassette {
  return createCassette({
    entries: pairs.map(p => ({
      request: req(p.input),
      chunks: [
        { type: 'text', content: p.output } as StreamChunk,
        { type: 'done' } as StreamChunk,
      ],
    })),
  })
}

function mapAdapter(fn: (text: string) => string, opts: { throwOn?: string } = {}): AdapterFactory {
  return {
    createSource: (request: AdapterRequest) => {
      const input = request.messages[request.messages.length - 1]?.content ?? ''
      return {
        abort: () => {},
        stream: async function* () {
          if (opts.throwOn && input.includes(opts.throwOn)) throw new Error('boom')
          yield { type: 'text', content: fn(input) } as StreamChunk
          yield { type: 'done' } as StreamChunk
        },
      }
    },
  }
}

describe('replayAgainst', () => {
  it('compares every recorded turn against the candidate', async () => {
    const cassette = buildCassette([
      { input: 'hi', output: 'hello world' },
      { input: 'bye', output: 'goodbye world' },
    ])
    const candidate = mapAdapter(x => `echo ${x}`)
    const r = await replayAgainst(cassette, candidate)
    expect(r).toHaveLength(2)
    expect(r[0]!.input).toBe('hi')
    expect(r[0]!.recorded.text).toBe('hello world')
    expect(r[0]!.candidate.text).toBe('echo hi')
    expect(r[0]!.similarity).toBeGreaterThanOrEqual(0)
  })

  it('similarity is 1 when outputs match exactly', async () => {
    const cassette = buildCassette([{ input: 'q', output: 'same answer' }])
    const candidate = mapAdapter(() => 'same answer')
    const [turn] = await replayAgainst(cassette, candidate)
    expect(turn!.similarity).toBe(1)
  })

  it('limit caps the number of turns', async () => {
    const cassette = buildCassette([
      { input: 'a', output: 'A' },
      { input: 'b', output: 'B' },
      { input: 'c', output: 'C' },
    ])
    const r = await replayAgainst(cassette, mapAdapter(x => x), { limit: 2 })
    expect(r).toHaveLength(2)
  })

  it('captures candidate errors without failing the whole run', async () => {
    const cassette = buildCassette([
      { input: 'ok', output: 'ok' },
      { input: 'BAD', output: 'x' },
    ])
    const r = await replayAgainst(cassette, mapAdapter(x => x, { throwOn: 'BAD' }))
    expect(r[1]!.candidate.error).toBe('boom')
    expect(r[0]!.candidate.error).toBeUndefined()
  })

  it('respects concurrency > 1', async () => {
    const cassette = buildCassette(
      Array.from({ length: 6 }, (_, i) => ({ input: `i${i}`, output: `o${i}` })),
    )
    const r = await replayAgainst(cassette, mapAdapter(x => x), { concurrency: 3 })
    expect(r).toHaveLength(6)
    expect(r.map(x => x.turn)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('rejects non-integer / non-finite concurrency and limit', async () => {
    const cassette = buildCassette([{ input: 'a', output: 'A' }])
    const candidate = mapAdapter(x => x)
    await expect(replayAgainst(cassette, candidate, { concurrency: 1.5 })).rejects.toThrow(
      /non-negative finite integer/,
    )
    await expect(replayAgainst(cassette, candidate, { concurrency: Number.NaN })).rejects.toThrow(
      /non-negative finite integer/,
    )
    await expect(replayAgainst(cassette, candidate, { limit: -1 })).rejects.toThrow(
      /non-negative finite integer/,
    )
    await expect(replayAgainst(cassette, candidate, { limit: Number.POSITIVE_INFINITY })).rejects.toThrow(
      /non-negative finite integer/,
    )
  })
})

describe('summarizeReplay', () => {
  it('aggregates avg / min / errorCount', () => {
    const s = summarizeReplay([
      { turn: 0, input: '', recorded: { text: '', chunkCount: 0 }, candidate: { text: '', chunkCount: 0 }, similarity: 1 },
      { turn: 1, input: '', recorded: { text: '', chunkCount: 0 }, candidate: { text: '', chunkCount: 0, error: 'boom' }, similarity: 0.3 },
      { turn: 2, input: '', recorded: { text: '', chunkCount: 0 }, candidate: { text: '', chunkCount: 0 }, similarity: 0.7 },
    ])
    expect(s.turnCount).toBe(3)
    expect(s.errorCount).toBe(1)
    expect(s.avgSimilarity).toBeCloseTo((1 + 0.3 + 0.7) / 3, 5)
    expect(s.minSimilarity).toBe(0.3)
  })

  it('handles empty list', () => {
    expect(summarizeReplay([])).toEqual({
      avgSimilarity: 0,
      minSimilarity: 0,
      errorCount: 0,
      turnCount: 0,
    })
  })
})
