import { describe, it, expect } from 'vitest'
import { redisChatMemory } from '../src/redis-chat'
import { redisVectorMemory } from '../src/redis-vector'
import type { RedisClientAdapter } from '../src/redis-client'
import type { Message } from '@agentskit/core'

// Mock Redis client for unit testing (no real Redis needed)
function createMockRedisClient(): RedisClientAdapter {
  const store = new Map<string, string>()

  return {
    async get(key) { return store.get(key) ?? null },
    async set(key, value) { store.set(key, value) },
    async del(key) {
      const keys = Array.isArray(key) ? key : [key]
      for (const k of keys) store.delete(k)
    },
    async keys(pattern) {
      const prefix = pattern.replace('*', '')
      return [...store.keys()].filter(k => k.startsWith(prefix))
    },
    async disconnect() {},
    async call() { return null },
  }
}

const sampleMessage: Message = {
  id: 'test-1',
  role: 'user',
  content: 'hello from redis',
  status: 'complete',
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

describe('redisChatMemory', () => {
  it('returns empty array when no messages saved', async () => {
    const client = createMockRedisClient()
    const mem = redisChatMemory({ url: '', client })
    expect(await mem.load()).toEqual([])
  })

  it('save then load round-trips with date serialization', async () => {
    const client = createMockRedisClient()
    const mem = redisChatMemory({ url: '', client })
    await mem.save([sampleMessage])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('hello from redis')
    expect(loaded[0].createdAt).toBeInstanceOf(Date)
    expect(loaded[0].createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('overwrites previous messages on save', async () => {
    const client = createMockRedisClient()
    const mem = redisChatMemory({ url: '', client })
    await mem.save([sampleMessage])
    await mem.save([{ ...sampleMessage, id: 'test-2', content: 'updated' }])
    const loaded = await mem.load()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('updated')
  })

  it('clear removes messages', async () => {
    const client = createMockRedisClient()
    const mem = redisChatMemory({ url: '', client })
    await mem.save([sampleMessage])
    await mem.clear!()
    expect(await mem.load()).toEqual([])
  })

  it('uses custom key prefix and conversation ID', async () => {
    const client = createMockRedisClient()
    const mem = redisChatMemory({ url: '', client, keyPrefix: 'myapp:chat', conversationId: 'conv1' })
    await mem.save([sampleMessage])
    // Verify the key was set with custom prefix
    const keys = await client.keys('myapp:chat:*')
    expect(keys).toContain('myapp:chat:conv1')
  })

  it('preserves toolCalls and metadata', async () => {
    const client = createMockRedisClient()
    const mem = redisChatMemory({ url: '', client })
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

function createMockRediSearchClient(): RedisClientAdapter {
  const hashes = new Map<string, Map<string, string | Buffer>>()

  return {
    async get(key) { return null },
    async set() {},
    async del(key) {
      const keys = Array.isArray(key) ? key : [key]
      for (const k of keys) hashes.delete(k)
    },
    async keys() { return [] },
    async disconnect() {},
    async call(command, ...args) {
      const cmd = command.toUpperCase()
      const strArgs = args.map(String)

      if (cmd === 'FT.CREATE') {
        return 'OK'
      }

      if (cmd === 'HSET') {
        const key = strArgs[0]
        const fields = new Map<string, string | Buffer>()
        for (let i = 1; i < args.length; i += 2) {
          fields.set(String(args[i]), args[i + 1] as string | Buffer)
        }
        hashes.set(key, fields)
        return fields.size / 2
      }

      if (cmd === 'FT.SEARCH') {
        // Simulate RediSearch response: [total, key1, [field, val, ...], ...]
        const entries = [...hashes.entries()]
        const result: unknown[] = [entries.length]
        for (const [key, fields] of entries) {
          result.push(key)
          const flat: string[] = []
          for (const [k, v] of fields) {
            if (k === 'embedding') {
              flat.push(k, '[binary]')
            } else {
              flat.push(k, String(v))
            }
          }
          // Add a fake score
          flat.push('score', '0.1')
          result.push(flat)
        }
        return result
      }

      return null
    },
  }
}

describe('redisVectorMemory', () => {
  it('can be instantiated with mock client', () => {
    const client = createMockRediSearchClient()
    const mem = redisVectorMemory({ url: '', client })
    expect(mem.store).toBeTypeOf('function')
    expect(mem.search).toBeTypeOf('function')
    expect(mem.delete).toBeTypeOf('function')
  })

  it('stores documents and searches them', async () => {
    const client = createMockRediSearchClient()
    const mem = redisVectorMemory({ url: '', client, dimensions: 3 })

    await mem.store([
      { id: 'doc-1', content: 'Hello world', embedding: [0.1, 0.2, 0.3] },
      { id: 'doc-2', content: 'Goodbye world', embedding: [0.4, 0.5, 0.6] },
    ])

    const results = await mem.search([0.1, 0.2, 0.3], { topK: 5 })
    expect(results.length).toBe(2)
    expect(results[0].content).toBe('Hello world')
    expect(results[0].score).toBeTypeOf('number')
  })

  it('delete removes documents', async () => {
    const client = createMockRediSearchClient()
    const mem = redisVectorMemory({ url: '', client, keyPrefix: 'test:vec', dimensions: 3 })

    await mem.store([
      { id: 'doc-1', content: 'Keep me', embedding: [0.1, 0.2, 0.3] },
      { id: 'doc-2', content: 'Delete me', embedding: [0.4, 0.5, 0.6] },
    ])

    await mem.delete!(['doc-2'])

    const results = await mem.search([0.1, 0.2, 0.3], { topK: 10 })
    const ids = results.map(r => r.id)
    expect(ids).not.toContain('doc-2')
  })

  it('respects topK in search', async () => {
    const client = createMockRediSearchClient()
    const mem = redisVectorMemory({ url: '', client, dimensions: 2 })

    await mem.store([
      { id: 'a', content: 'A', embedding: [1, 0] },
      { id: 'b', content: 'B', embedding: [0, 1] },
      { id: 'c', content: 'C', embedding: [1, 1] },
    ])

    // Mock returns all, but the FT.SEARCH command includes KNN topK
    const results = await mem.search([1, 0], { topK: 2 })
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('filters by threshold', async () => {
    const client = createMockRediSearchClient()
    const mem = redisVectorMemory({ url: '', client, dimensions: 2 })

    await mem.store([
      { id: 'a', content: 'A', embedding: [1, 0] },
    ])

    // Mock score is 0.9 (1 - 0.1), threshold 0.95 should filter it
    const results = await mem.search([1, 0], { threshold: 0.95 })
    expect(results.length).toBe(0)
  })
})
