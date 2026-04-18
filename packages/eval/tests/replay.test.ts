import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import {
  createRecordingAdapter,
  createReplayAdapter,
  saveCassette,
  loadCassette,
  parseCassette,
  serializeCassette,
  fingerprintRequest,
} from '../src/replay'
import { lastUserContent } from '../src/replay/cassette'
import type { ToolDefinition } from '@agentskit/core'

function fakeAdapter(chunks: StreamChunk[]): AdapterFactory {
  return {
    createSource: () => ({
      abort: () => {},
      stream: async function* () {
        for (const c of chunks) yield c
      },
    }),
  }
}

function req(content: string): AdapterRequest {
  return {
    messages: [
      { id: '1', role: 'user', content, status: 'complete', createdAt: new Date(0) },
    ],
  }
}

async function collect(source: AsyncIterableIterator<StreamChunk>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of source) out.push(c)
  return out
}

describe('replay engine', () => {
  it('records streamed chunks into a cassette', async () => {
    const base = fakeAdapter([
      { type: 'text', content: 'hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ])
    const { factory, cassette } = createRecordingAdapter(base, { seed: 42 })

    const src = factory.createSource(req('hi'))
    const chunks = await collect(src.stream())

    expect(chunks).toHaveLength(3)
    expect(cassette.seed).toBe(42)
    expect(cassette.entries).toHaveLength(1)
    expect(cassette.entries[0]!.chunks).toEqual(chunks)
  })

  it('replays recorded chunks bit-for-bit in strict mode', async () => {
    const base = fakeAdapter([
      { type: 'text', content: 'A' },
      { type: 'done' },
    ])
    const { factory: rec, cassette } = createRecordingAdapter(base)
    await collect(rec.createSource(req('ping')).stream())

    const replay = createReplayAdapter(cassette)
    const replayed = await collect(replay.createSource(req('ping')).stream())
    expect(replayed).toEqual(cassette.entries[0]!.chunks)
  })

  it('throws on strict miss', async () => {
    const base = fakeAdapter([{ type: 'done' }])
    const { factory, cassette } = createRecordingAdapter(base)
    await collect(factory.createSource(req('a')).stream())

    const replay = createReplayAdapter(cassette)
    expect(() => replay.createSource(req('b'))).toThrow(/Replay miss/)
  })

  it('sequential mode returns entries in recording order', async () => {
    const base = fakeAdapter([{ type: 'text', content: 'x' }, { type: 'done' }])
    const { factory, cassette } = createRecordingAdapter(base)
    await collect(factory.createSource(req('a')).stream())
    await collect(factory.createSource(req('b')).stream())

    const replay = createReplayAdapter(cassette, { mode: 'sequential' })
    const first = await collect(replay.createSource(req('unrelated')).stream())
    const second = await collect(replay.createSource(req('also unrelated')).stream())
    expect(first[0]!.content).toBe('x')
    expect(second[0]!.content).toBe('x')
  })

  it('loose mode matches by last user content', async () => {
    const base = fakeAdapter([{ type: 'text', content: 'loose' }, { type: 'done' }])
    const { factory, cassette } = createRecordingAdapter(base)
    await collect(factory.createSource(req('echo please')).stream())

    const replay = createReplayAdapter(cassette, { mode: 'loose' })
    const r = await collect(replay.createSource(req('echo please')).stream())
    expect(r[0]!.content).toBe('loose')
  })

  it('serializes and parses cassettes round-trip', () => {
    const base = fakeAdapter([{ type: 'done' }])
    const { cassette } = createRecordingAdapter(base, { seed: 'abc' })
    cassette.entries.push({ request: req('x'), chunks: [{ type: 'text', content: 'y' }] })

    const json = serializeCassette(cassette)
    const back = parseCassette(json)
    expect(back.seed).toBe('abc')
    expect(back.entries[0]!.chunks[0]!.content).toBe('y')
  })

  it('saves and loads cassettes from disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ak-replay-'))
    try {
      const base = fakeAdapter([{ type: 'text', content: 'z' }, { type: 'done' }])
      const { factory, cassette } = createRecordingAdapter(base)
      await collect(factory.createSource(req('hey')).stream())

      const path = join(dir, 'nested', 'cassette.json')
      await saveCassette(path, cassette)
      const reloaded = await loadCassette(path)
      expect(reloaded.entries).toHaveLength(1)
      expect(reloaded.entries[0]!.chunks[0]!.content).toBe('z')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fingerprintRequest is stable for equivalent requests', () => {
    expect(fingerprintRequest(req('same'))).toBe(fingerprintRequest(req('same')))
    expect(fingerprintRequest(req('a'))).not.toBe(fingerprintRequest(req('b')))
  })

  it('fingerprintRequest includes context when present', () => {
    const tool: ToolDefinition = {
      name: 'search',
      description: 'x',
      schema: { type: 'object' },
      execute: async () => ({ content: '' }),
    }
    const withCtx: AdapterRequest = {
      ...req('q'),
      context: { systemPrompt: 'sys', temperature: 0.7, maxTokens: 100, tools: [tool] },
    }
    const withoutCtx = req('q')
    expect(fingerprintRequest(withCtx)).not.toBe(fingerprintRequest(withoutCtx))
  })

  it('lastUserContent returns empty string when no user message', () => {
    expect(
      lastUserContent({
        messages: [
          { id: '1', role: 'assistant', content: 'hi', status: 'complete', createdAt: new Date(0) },
        ],
      }),
    ).toBe('')
  })

  it('parseCassette rejects unsupported versions', () => {
    expect(() => parseCassette(JSON.stringify({ version: 999, entries: [] }))).toThrow(/Unsupported cassette version/)
  })

  it('parseCassette rejects missing entries', () => {
    expect(() => parseCassette(JSON.stringify({ version: 1 }))).toThrow(/entries missing/)
  })

  it('loose mode throws when no entry matches', async () => {
    const base = fakeAdapter([{ type: 'done' }])
    const { factory, cassette } = createRecordingAdapter(base)
    await collect(factory.createSource(req('hello')).stream())

    const replay = createReplayAdapter(cassette, { mode: 'loose' })
    expect(() => replay.createSource(req('different text'))).toThrow(/loose/)
  })

  it('sequential mode throws when exhausted', async () => {
    const base = fakeAdapter([{ type: 'done' }])
    const { factory, cassette } = createRecordingAdapter(base)
    await collect(factory.createSource(req('a')).stream())

    const replay = createReplayAdapter(cassette, { mode: 'sequential' })
    await collect(replay.createSource(req('ignored')).stream())
    expect(() => replay.createSource(req('ignored'))).toThrow(/exhausted/)
  })

  it('abort is a no-op on replay sources', async () => {
    const base = fakeAdapter([{ type: 'done' }])
    const { factory, cassette } = createRecordingAdapter(base)
    await collect(factory.createSource(req('a')).stream())
    const src = createReplayAdapter(cassette).createSource(req('a'))
    expect(() => src.abort()).not.toThrow()
  })
})
