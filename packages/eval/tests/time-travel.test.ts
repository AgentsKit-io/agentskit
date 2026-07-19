import { describe, expect, it } from 'vitest'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'
import {
  createCassette,
  createReplayAdapter,
  createTimeTravelSession,
} from '../src/replay'

function req(text: string): AdapterRequest {
  return {
    messages: [
      { id: '1', role: 'user', content: text, status: 'complete', createdAt: new Date(0) },
    ],
  }
}

function build(): ReturnType<typeof createCassette> {
  return createCassette({
    seed: 's',
    entries: [
      {
        request: req('a'),
        chunks: [
          { type: 'text', content: 'A1' },
          { type: 'tool_call', toolCall: { id: 't1', name: 'search', args: '{}', result: 'old' } },
          { type: 'done' },
        ],
      },
      {
        request: req('b'),
        chunks: [
          { type: 'text', content: 'B1' },
          { type: 'done' },
        ],
      },
    ],
  })
}

describe('time travel', () => {
  it('reports flattened length', () => {
    const s = createTimeTravelSession(build())
    expect(s.length).toBe(5)
    expect(s.cursor).toBe(0)
  })

  it('step advances cursor', () => {
    const s = createTimeTravelSession(build())
    const c1 = s.step()
    const c2 = s.step()
    expect(c1?.content).toBe('A1')
    expect(c2?.type).toBe('tool_call')
    expect(s.cursor).toBe(2)
  })

  it('step returns undefined past the end', () => {
    const s = createTimeTravelSession(build())
    s.seek(s.length)
    expect(s.step()).toBeUndefined()
  })

  it('peek does not move the cursor', () => {
    const s = createTimeTravelSession(build())
    expect(s.peek(3)?.content).toBe('B1')
    expect(s.cursor).toBe(0)
  })

  it('seek rejects out-of-range indices', () => {
    const s = createTimeTravelSession(build())
    expect(() => s.seek(-1)).toThrow(/out of range/)
    expect(() => s.seek(s.length + 1)).toThrow(/out of range/)
  })

  it('override mutates chunk at index', () => {
    const s = createTimeTravelSession(build())
    const prior = s.override(1, {
      type: 'tool_call',
      toolCall: { id: 't1', name: 'search', args: '{}', result: 'new' },
    })
    expect(prior?.toolCall?.result).toBe('old')
    expect(s.peek(1)?.toolCall?.result).toBe('new')
  })

  it('override rejects out-of-range', () => {
    const s = createTimeTravelSession(build())
    expect(() => s.override(99, { type: 'done' })).toThrow(/out of range/)
  })

  it('fork produces a cassette truncated at the index', () => {
    const s = createTimeTravelSession(build())
    s.override(1, {
      type: 'tool_call',
      toolCall: { id: 't1', name: 'search', args: '{}', result: 'mocked' },
    })
    const forked = s.fork(2)
    expect(forked.entries).toHaveLength(1)
    expect(forked.entries[0]!.chunks).toHaveLength(2)
    expect(forked.entries[0]!.chunks[1]!.toolCall?.result).toBe('mocked')

    const replay = createReplayAdapter(forked, { mode: 'sequential' })
    const collected: StreamChunk[] = []
    const run = async () => {
      for await (const c of replay.createSource(req('a')).stream()) collected.push(c)
    }
    return run().then(() => {
      expect(collected[1]!.toolCall?.result).toBe('mocked')
    })
  })

  it('fork at index 0 returns empty cassette', () => {
    const s = createTimeTravelSession(build())
    expect(s.fork(0).entries).toHaveLength(0)
  })

  it('fork at end returns full cassette', () => {
    const s = createTimeTravelSession(build())
    const end = s.fork(s.length)
    expect(end.entries).toHaveLength(2)
    expect(end.entries[1]!.chunks).toHaveLength(2)
  })

  it('fork rejects out-of-range', () => {
    const s = createTimeTravelSession(build())
    expect(() => s.fork(-1)).toThrow(/out of range/)
    expect(() => s.fork(s.length + 1)).toThrow(/out of range/)
  })

  it('fork mid-entry truncates that entry only', () => {
    const s = createTimeTravelSession(build())
    const forked = s.fork(1)
    expect(forked.entries).toHaveLength(1)
    expect(forked.entries[0]!.chunks).toHaveLength(1)
    expect(forked.entries[0]!.chunks[0]!.content).toBe('A1')
  })

  it('snapshot reflects overrides', () => {
    const s = createTimeTravelSession(build())
    s.override(0, { type: 'text', content: 'MUTATED' })
    const snap = s.snapshot()
    expect(snap.entries[0]!.chunks[0]!.content).toBe('MUTATED')
  })

  it('rejects NaN and fractional indices for seek/override/fork', () => {
    const s = createTimeTravelSession(build())
    expect(() => s.seek(Number.NaN)).toThrow(/out of range/)
    expect(() => s.seek(1.5)).toThrow(/out of range/)
    expect(() => s.override(0.5, { type: 'done' })).toThrow(/out of range/)
    expect(() => s.fork(Number.POSITIVE_INFINITY)).toThrow(/out of range/)
  })

  it('snapshot and fork are isolated from later session mutation', () => {
    const s = createTimeTravelSession(build())
    const snap = s.snapshot()
    const forked = s.fork(2)
    s.override(0, { type: 'text', content: 'LATER' })
    expect(snap.entries[0]!.chunks[0]!.content).toBe('A1')
    expect(forked.entries[0]!.chunks[0]!.content).toBe('A1')
    snap.entries[0]!.chunks[0] = { type: 'text', content: 'SNAP_HACK' }
    expect(s.peek(0)?.content).toBe('LATER')
  })
})
