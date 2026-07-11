import { describe, it, expect } from 'vitest'
import { ConfigError } from '../src/errors'
import { createInMemoryMemory, serializeMessages } from '../src/memory'
import { validateMemoryRecord } from '../src/memory-validation'
import type { Message } from '../src/types'

const sampleMessage: Message = {
  id: 'test-1',
  role: 'user',
  content: 'hello',
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

describe('createInMemoryMemory', () => {
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

describe('validateMemoryRecord', () => {
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
    const record = serializeMessages([{ ...sampleMessage, metadata }])
    expect(() => validateMemoryRecord(record)).toThrow(ConfigError)
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
})
