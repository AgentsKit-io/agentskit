import { describe, it, expect } from 'vitest'
import { ConfigError } from '../src/errors'
import { createInMemoryMemory, createLocalStorageMemory, deserializeMessages, serializeMessages } from '../src/memory'
import { validateMemoryRecord } from '../src/memory-validation'
import { buildMessage } from '../src/primitives'
import type { Message } from '../src/types'

const sampleMessage: Message = {
  id: 'test-1',
  role: 'user',
  content: 'hello',
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

describe('createInMemoryMemory', () => {
  it('allows memory implementations to observe cancellation', async () => {
    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    const mem: import('../src/types').ChatMemory = {
      load: async options => { options?.signal?.throwIfAborted(); return [] },
      save: async (_messages, options) => { options?.signal?.throwIfAborted() },
      clear: async options => { options?.signal?.throwIfAborted() },
    }
    await expect(mem.load({ signal: controller.signal })).rejects.toThrow('cancelled')
    await expect(mem.save([], { signal: controller.signal })).rejects.toThrow('cancelled')
    await expect(mem.clear?.({ signal: controller.signal })).rejects.toThrow('cancelled')
  })
  it('starts empty by default', async () => {
    const mem = createInMemoryMemory()
    expect(await mem.load()).toEqual([])
  })

  it('starts with initial messages', async () => {
    const mem = createInMemoryMemory([sampleMessage])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('hello')
  })

  it('save then load round-trips', async () => {
    const mem = createInMemoryMemory()
    await mem.save([sampleMessage])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('test-1')
  })

  it('clear empties messages', async () => {
    const mem = createInMemoryMemory([sampleMessage])
    await mem.clear!()
    expect(await mem.load()).toEqual([])
  })

  it('returns copies, not references', async () => {
    const mem = createInMemoryMemory([sampleMessage])
    const loaded1 = await mem.load()
    const loaded2 = await mem.load()
    expect(loaded1).not.toBe(loaded2)
  })
})

describe('serialization helpers', () => {
  it('round-trips message dates and nested message data', () => {
    const record = serializeMessages([{ ...sampleMessage, metadata: { source: 'test' } }])
    const messages = deserializeMessages(record)

    expect(messages[0]?.createdAt).toBeInstanceOf(Date)
    expect(messages[0]?.createdAt.toISOString()).toBe(sampleMessage.createdAt.toISOString())
    expect(messages[0]?.metadata).toEqual({ source: 'test' })
  })

  it('returns an empty history for an absent record', () => {
    expect(deserializeMessages(undefined)).toEqual([])
    expect(deserializeMessages(null)).toEqual([])
  })
})

describe('createLocalStorageMemory', () => {
  it('persists, hydrates, and clears serialized messages', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value) },
        removeItem: (key: string) => { values.delete(key) },
      },
    })

    try {
      const memory = createLocalStorageMemory('chat')
      await memory.save([sampleMessage])
      const loaded = await memory.load()

      expect(loaded[0]?.createdAt).toBeInstanceOf(Date)
      expect(loaded[0]?.id).toBe(sampleMessage.id)
      await memory.clear!()
      expect(await memory.load()).toEqual([])
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })

  it('does not require browser storage in a non-browser runtime', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    if (original) delete (globalThis as { localStorage?: unknown }).localStorage

    try {
      const memory = createLocalStorageMemory('chat')
      expect(await memory.load()).toEqual([])
      await expect(memory.save([sampleMessage])).resolves.toBeUndefined()
      await expect(memory.clear!()).resolves.toBeUndefined()
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
    }
  })

  it('surfaces corrupt stored data as a typed memory error', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => '{not-json', setItem: () => {}, removeItem: () => {} },
    })
    try {
      await expect(createLocalStorageMemory('chat').load()).rejects.toMatchObject({
        name: 'MemoryError', code: 'AK_MEMORY_LOAD_FAILED',
      })
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })

  it('rejects structurally invalid stored messages before deserialization', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => JSON.stringify({
          version: 1,
          messages: [{ ...sampleMessage, role: 'unknown', createdAt: sampleMessage.createdAt.toISOString() }],
        }),
      },
    })
    try {
      await expect(createLocalStorageMemory('chat').load()).rejects.toMatchObject({
        name: 'MemoryError', code: 'AK_MEMORY_LOAD_FAILED',
      })
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })

  it('surfaces browser storage permission failures as typed errors', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('denied') },
        setItem: () => { throw new Error('quota') },
        removeItem: () => { throw new Error('denied') },
      },
    })
    try {
      const memory = createLocalStorageMemory('chat')
      await expect(memory.load()).rejects.toMatchObject({ code: 'AK_MEMORY_LOAD_FAILED' })
      await expect(memory.save([sampleMessage])).rejects.toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
      await expect(memory.clear!()).rejects.toMatchObject({ code: 'AK_MEMORY_CLEAR_FAILED' })
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})

describe('validateMemoryRecord', () => {
  it('accepts records produced from messages with absent optional fields', () => {
    const record = serializeMessages([buildMessage({ role: 'assistant', content: 'hello' })])
    expect(record.messages[0]).not.toHaveProperty('metadata')
    expect(record.messages[0]).not.toHaveProperty('toolCallId')
    expect(validateMemoryRecord(record)).toEqual(record)
  })

  it('accepts the complete canonical serialized message graph', () => {
    const record = serializeMessages([{
      ...sampleMessage,
      role: 'assistant',
      parts: [{ type: 'image', source: 'https://example.com/image.png', detail: 'high' }],
      toolCalls: [{ id: 'call-1', name: 'lookup', args: { query: ['hello'] }, result: 'found', status: 'complete' }],
      metadata: { nested: { safe: true } },
    }])

    expect(validateMemoryRecord(record)).toEqual(record)
  })

  it.each([
    null,
    { version: 2, messages: [] },
    { version: 1, messages: [{ ...sampleMessage, createdAt: 'not-a-date' }] },
    { version: 1, messages: [{ ...sampleMessage, createdAt: '2026-02-30T00:00:00.000Z' }] },
    { version: 1, messages: [{ ...sampleMessage, id: '' }] },
    { version: 1, messages: [{ ...sampleMessage, toolCalls: [{ id: '', name: 'lookup', args: {}, status: 'complete' }] }] },
    { version: 1, messages: [{ ...sampleMessage, toolCalls: [{ id: 'call-1', name: '', args: {}, status: 'complete' }] }] },
    { version: 1, messages: [{ id: 'x', role: 'unknown', content: '', status: 'complete', createdAt: '2026-01-01T00:00:00.000Z' }] },
  ])('rejects an invalid record without echoing input', input => {
    expect(() => validateMemoryRecord(input)).toThrow(ConfigError)
    try {
      validateMemoryRecord(input)
    } catch (error) {
      expect((error as Error).message).toBe('Serialized message record is invalid.')
    }
  })

  it('rejects cyclic JSON without overflowing the stack', () => {
    const metadata: Record<string, unknown> = {}
    metadata.self = metadata
    expect(() => serializeMessages([{ ...sampleMessage, metadata }])).toThrow()
  })

  it('rejects excessively deep JSON without overflowing the stack', () => {
    const metadata: Record<string, unknown> = {}
    let cursor = metadata
    for (let depth = 0; depth < 40; depth++) {
      const next: Record<string, unknown> = {}
      cursor.next = next
      cursor = next
    }
    const record = serializeMessages([{ ...sampleMessage, metadata }])
    expect(() => validateMemoryRecord(record)).toThrow(ConfigError)
  })

  it('allows a shared non-cyclic JSON reference', () => {
    const shared = { safe: true }
    const record = serializeMessages([{ ...sampleMessage, metadata: { first: shared, second: shared } }])
    expect(validateMemoryRecord(record)).toEqual(record)
  })

  it('projects only canonical structural fields', () => {
    const record = serializeMessages([{
      ...sampleMessage,
      parts: [{ type: 'text', text: 'hello', future: 'drop' }],
      toolCalls: [{ id: 'call-1', name: 'lookup', args: { keep: true }, status: 'complete', future: 'drop' }],
      metadata: { keep: true },
      future: 'drop',
    } as unknown as Message])

    const validated = validateMemoryRecord(record)
    expect(validated.messages[0]).not.toHaveProperty('future')
    expect(validated.messages[0]?.parts?.[0]).not.toHaveProperty('future')
    expect(validated.messages[0]?.toolCalls?.[0]).not.toHaveProperty('future')
    expect(validated.messages[0]?.toolCalls?.[0]?.args).toEqual({ keep: true })
    expect(validated.messages[0]?.metadata).toEqual({ keep: true })
  })

  it('snapshots stateful properties once before validation', () => {
    let reads = 0
    const message = { ...serializeMessages([sampleMessage]).messages[0] }
    Object.defineProperty(message, 'content', {
      enumerable: true,
      get: () => (++reads === 1 ? 'stable' : { unsafe: true }),
    })

    const validated = validateMemoryRecord({ version: 1, messages: [message] })
    expect(validated.messages[0]?.content).toBe('stable')
    expect(reads).toBe(1)
  })

  it('rejects proxy-backed records with a typed error', () => {
    const proxy = new Proxy({}, {})
    expect(() => validateMemoryRecord(proxy)).toThrow(ConfigError)
  })

  it('accepts and projects every supported content part', () => {
    const record = serializeMessages([{
      ...sampleMessage,
      parts: [
        { type: 'text', text: 'text' },
        { type: 'image', source: 'image', mimeType: 'image/png', detail: 'auto' },
        { type: 'audio', source: 'audio', mimeType: 'audio/wav', durationSec: 1 },
        { type: 'video', source: 'video', durationSec: 2 },
        { type: 'file', source: 'file', filename: 'file.txt' },
      ],
      toolCalls: [{ id: 'call-1', name: 'lookup', args: {}, status: 'error', error: 'failed' }],
      toolCallId: 'call-1',
    }])

    const validated = validateMemoryRecord(record)
    expect(validated.messages[0]?.parts).toHaveLength(5)
    expect(validated.messages[0]?.toolCalls?.[0]?.error).toBe('failed')
    expect(validated.messages[0]?.toolCallId).toBe('call-1')
  })

  it.each([
    { parts: {} },
    { parts: [{ type: 'unknown', source: 'x' }] },
    { parts: [{ type: 'text' }] },
    { parts: [{ type: 'image' }] },
    { parts: [{ type: 'image', source: 'x', mimeType: 1 }] },
    { parts: [{ type: 'image', source: 'x', detail: 'full' }] },
    { parts: [{ type: 'audio', source: 'x', durationSec: '1' }] },
    { parts: [{ type: 'audio', source: 'x', durationSec: -1 }] },
    { parts: [{ type: 'file', source: 'x', filename: 1 }] },
    { toolCalls: {} },
    { toolCalls: [{ id: 'x', name: 'tool', args: [], status: 'complete' }] },
    { toolCalls: [{ id: 'x', name: 'tool', args: {}, status: 'unknown' }] },
    { toolCalls: [{ id: 'x', name: 'tool', args: {}, status: 'complete', result: 1 }] },
    { toolCalls: [{ id: 'x', name: 'tool', args: {}, status: 'complete', error: 1 }] },
    { toolCallId: 1 },
    { metadata: [] },
    { content: 1 },
    { role: 'unknown' },
    { status: 'unknown' },
    { createdAt: '2026-01-01' },
  ])('rejects malformed message fields %j', (extra) => {
    expect(() => validateMemoryRecord({
      version: 1,
      messages: [{ ...serializeMessages([sampleMessage]).messages[0], ...extra }],
    })).toThrow(ConfigError)
  })
})
