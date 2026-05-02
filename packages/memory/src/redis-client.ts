import { ErrorCodes, MemoryError } from '@agentskit/core'

/**
 * Internal Redis client adapter interface.
 * Abstracts the underlying Redis library so it can be swapped
 * (e.g., from `redis` to `ioredis`) without changing consumers.
 */
export interface RedisClientAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  del(key: string | string[]): Promise<void>
  keys(pattern: string): Promise<string[]>
  disconnect(): Promise<void>
  call(command: string, ...args: (string | number | Buffer)[]): Promise<unknown>
}

export interface RedisConnectionConfig {
  url: string
  client?: RedisClientAdapter
}

export async function createRedisClientAdapter(url: string): Promise<RedisClientAdapter> {
  let redis: typeof import('redis')
  try {
    redis = await import('redis')
  } catch {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_PEER_MISSING,
      message: 'Install redis to use Redis memory backends: npm install redis',
      hint: 'redisChatMemory and redisVectorMemory use the optional peer "redis".',
    })
  }

  const client = redis.createClient({ url })
  await client.connect()

  return {
    async get(key) {
      return await client.get(key)
    },
    async set(key, value) {
      await client.set(key, value)
    },
    async del(key) {
      const keys = Array.isArray(key) ? key : [key]
      if (keys.length > 0) await client.del(keys)
    },
    async keys(pattern) {
      return await client.keys(pattern)
    },
    async disconnect() {
      await client.disconnect()
    },
    async call(command, ...args) {
      return await client.sendCommand([command, ...args.map(String)])
    },
  }
}
