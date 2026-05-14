/**
 * Extra redis-chat tests to cover branches not hit by the main redis.test.ts:
 * - decodeMessages catch branch (invalid JSON → return [])
 * - lazy createRedisClientAdapter path (no client provided)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { RedisClientAdapter } from '../src/redis-client'

afterEach(() => {
  vi.resetModules()
})

// Simulates a client that returns invalid JSON from get()
function makeBrokenJsonClient(): RedisClientAdapter {
  return {
    async get() { return 'INVALID_JSON_!!!{' },
    async set() {},
    async del() {},
    async keys() { return [] },
    async disconnect() {},
    async call() { return null },
  }
}

describe('redisChatMemory — extra branches', () => {
  it('decodeMessages returns [] on invalid JSON', async () => {
    const { redisChatMemory } = await import('../src/redis-chat')
    const mem = redisChatMemory({ url: '', client: makeBrokenJsonClient() })
    const result = await mem.load()
    expect(result).toEqual([])
  })

  it('lazy client creation path (no client option)', async () => {
    // Inject a fake redis module so createRedisClientAdapter succeeds
    const store = new Map<string, string>()
    const fakeRedisClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, val: string) => { store.set(key, val) }),
      del: vi.fn(async (keys: string[]) => { for (const k of keys) store.delete(k) }),
      keys: vi.fn(async () => []),
      disconnect: vi.fn().mockResolvedValue(undefined),
      sendCommand: vi.fn().mockResolvedValue(null),
    }
    const fakeRedis = { createClient: vi.fn(() => fakeRedisClient) }
    vi.doMock('redis', () => fakeRedis)

    const { redisChatMemory } = await import('../src/redis-chat')
    // No client option — should call createRedisClientAdapter
    const mem = redisChatMemory({ url: 'redis://localhost:6379' })
    await mem.save([])
    const result = await mem.load()
    expect(result).toEqual([])
  })
})
