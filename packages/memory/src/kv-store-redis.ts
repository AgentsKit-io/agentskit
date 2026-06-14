// redis KV backend (injected client; lazy default via node-redis).

import { MemoryError } from '@agentskit/core'
import { isExpired, type AgentskitMemoryStore, type RedisKvConfig, type RedisLike } from './kv-store-types'

interface RedisEnvelope {
  readonly value: unknown
  readonly insertedAt: number
}

export interface CreateRedisStoreOpts {
  readonly config: RedisKvConfig
  readonly client: RedisLike
}

export const createRedisStore = ({ config, client }: CreateRedisStoreOpts): AgentskitMemoryStore => {
  const prefix = config.prefix
  const namespaced = (key: string): string => `${prefix}${key}`

  const wrap = async <T>(op: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (cause) {
      throw new MemoryError({
        code: 'AK_MEMORY_REDIS_CONNECTION_FAILED',
        message: `createRedisStore.${op}: redis command failed — ${cause instanceof Error ? cause.message : String(cause)}`,
        cause: cause instanceof Error ? cause : undefined,
      })
    }
  }

  const enforce = async (): Promise<void> => {
    if (config.maxMessages === undefined) return
    const keys = await wrap('enforce', () => Promise.resolve(client.keys(`${prefix}*`)))
    if (keys.length <= config.maxMessages) return
    const envelopes: { key: string; insertedAt: number }[] = []
    for (const fullKey of keys) {
      const raw = await wrap('enforce', () => Promise.resolve(client.get(fullKey)))
      if (raw === null) continue
      envelopes.push({ key: fullKey, insertedAt: (JSON.parse(raw) as RedisEnvelope).insertedAt })
    }
    envelopes.sort((a, b) => a.insertedAt - b.insertedAt)
    let excess = envelopes.length - config.maxMessages
    for (const entry of envelopes) {
      if (excess <= 0) break
      await wrap('enforce', () => Promise.resolve(client.del(entry.key)))
      excess -= 1
    }
  }

  return {
    id: `redis:${prefix}`,
    async get(key) {
      const raw = await wrap('get', () => Promise.resolve(client.get(namespaced(key))))
      if (raw === null) return undefined
      const envelope = JSON.parse(raw) as RedisEnvelope
      if (isExpired({ value: envelope.value, insertedAt: envelope.insertedAt }, config.ttlSeconds, Date.now())) {
        await wrap('get', () => Promise.resolve(client.del(namespaced(key))))
        return undefined
      }
      return envelope.value
    },
    async set(key, value) {
      const payload = JSON.stringify({ value, insertedAt: Date.now() } satisfies RedisEnvelope)
      const options = config.ttlSeconds === undefined ? undefined : { EX: config.ttlSeconds }
      await wrap('set', () => Promise.resolve(client.set(namespaced(key), payload, options)))
      await enforce()
    },
  }
}

/** Bridge an `ioredis`-style client to the {@link RedisLike} options-object shape. */
export const adaptIoredis = (io: {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>
  del(key: string): Promise<unknown>
  keys(pattern: string): Promise<string[]>
}): RedisLike => ({
  get: (key) => io.get(key),
  set: (key, value, options) =>
    options?.EX === undefined ? io.set(key, value) : io.set(key, value, 'EX', options.EX),
  del: (key) => io.del(key),
  keys: (pattern) => io.keys(pattern),
})

/** Lazy-import `redis` (node-redis v4), connect, and return a client; `undefined` if absent. */
export const tryDefaultRedisClient = async (url: string): Promise<RedisLike | undefined> => {
  try {
    const moduleId = 'redis'
    const mod = (await import(/* @vite-ignore */ moduleId)) as unknown as {
      readonly createClient?: (opts: { url: string }) => RedisLike & { connect(): Promise<unknown> }
    }
    const createClient = mod.createClient
    if (typeof createClient !== 'function') return undefined
    const client = createClient({ url })
    try {
      await client.connect()
    } catch (cause) {
      throw new MemoryError({
        code: 'AK_MEMORY_REDIS_CONNECTION_FAILED',
        message: `tryDefaultRedisClient: redis connect() failed — ${cause instanceof Error ? cause.message : String(cause)}`,
        cause: cause instanceof Error ? cause : undefined,
      })
    }
    return client
  } catch (err) {
    if (err instanceof MemoryError) throw err
    return undefined
  }
}
