import { describe, expect, it } from 'vitest'
import { adaptIoredis, createRedisStore, type RedisLike } from '../src/index'

const fakeRedis = (): RedisLike => {
  const m = new Map<string, string>()
  return {
    get: async (k) => m.get(k) ?? null,
    set: async (k, v) => void m.set(k, v),
    del: async (k) => void m.delete(k),
    keys: async (pattern) => {
      const prefix = pattern.replace(/\*$/, '')
      return [...m.keys()].filter((k) => k.startsWith(prefix))
    },
  }
}

describe('createRedisStore', () => {
  it('namespaces keys by prefix and round-trips', async () => {
    const client = fakeRedis()
    const s = createRedisStore({ config: { backend: 'redis', url: 'redis://x', prefix: 'ak:' }, client })
    await s.set('greeting', 'hi')
    expect(await s.get('greeting')).toBe('hi')
    expect(await client.keys('ak:*')).toEqual(['ak:greeting'])
  })

  it('evicts oldest beyond maxMessages', async () => {
    const s = createRedisStore({
      config: { backend: 'redis', url: 'redis://x', prefix: 'ak:', maxMessages: 1 },
      client: fakeRedis(),
    })
    await s.set('a', 1)
    await s.set('b', 2)
    expect(await s.get('a')).toBeUndefined()
    expect(await s.get('b')).toBe(2)
  })
})

describe('adaptIoredis', () => {
  it('bridges the positional EX form', async () => {
    const calls: unknown[][] = []
    const io = {
      get: async () => null,
      set: async (...args: unknown[]) => void calls.push(args),
      del: async () => {},
      keys: async () => [],
    }
    const r = adaptIoredis(io)
    await r.set('k', 'v', { EX: 30 })
    expect(calls[0]).toEqual(['k', 'v', 'EX', 30])
  })
})
