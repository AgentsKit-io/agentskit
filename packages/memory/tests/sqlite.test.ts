import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { sqliteChatMemory } from '../src/sqlite'
import type { Message } from '@agentskit/core'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink } from 'node:fs/promises'

const sampleMessage: Message = {
  id: 'test-1',
  role: 'user',
  content: 'hello from sqlite',
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

describe('sqliteChatMemory', () => {
  let dbPath: string

  beforeEach(() => {
    dbPath = join(tmpdir(), `agentskit-sqlite-${Date.now()}.db`)
  })

  afterEach(async () => {
    try { await unlink(dbPath) } catch {}
  })

  it('returns empty array when no messages saved', async () => {
    const mem = sqliteChatMemory({ path: dbPath })
    expect(await mem.load()).toEqual([])
  })

  it('save then load round-trips with date serialization', async () => {
    const mem = sqliteChatMemory({ path: dbPath })
    await mem.save([sampleMessage])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('hello from sqlite')
    expect(loaded[0].createdAt).toBeInstanceOf(Date)
    expect(loaded[0].createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('overwrites previous messages on save', async () => {
    const mem = sqliteChatMemory({ path: dbPath })
    await mem.save([sampleMessage])
    await mem.save([{ ...sampleMessage, id: 'test-2', content: 'updated' }])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('updated')
  })

  it('clear removes messages', async () => {
    const mem = sqliteChatMemory({ path: dbPath })
    await mem.save([sampleMessage])
    await mem.clear!()
    expect(await mem.load()).toEqual([])
  })

  it('supports multiple conversation IDs', async () => {
    const mem1 = sqliteChatMemory({ path: dbPath, conversationId: 'conv1' })
    const mem2 = sqliteChatMemory({ path: dbPath, conversationId: 'conv2' })

    await mem1.save([{ ...sampleMessage, content: 'conv1 msg' }])
    await mem2.save([{ ...sampleMessage, content: 'conv2 msg' }])

    expect((await mem1.load())[0].content).toBe('conv1 msg')
    expect((await mem2.load())[0].content).toBe('conv2 msg')
  })

  it('preserves toolCalls and metadata', async () => {
    const mem = sqliteChatMemory({ path: dbPath })
    const msg: Message = {
      ...sampleMessage,
      toolCalls: [{ id: 'tc1', name: 'test', args: { x: 1 }, status: 'complete', result: 'ok' }],
      metadata: { key: 'value' },
    }
    await mem.save([msg])
    const loaded = await mem.load()
    expect(loaded[0].toolCalls?.[0].name).toBe('test')
    expect(loaded[0].metadata?.key).toBe('value')
  })
})
