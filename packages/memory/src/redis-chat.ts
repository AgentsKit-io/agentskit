import type {
  ChatMemory,
  Message,
} from '@agentskit/core'
import { serializeMessages } from '@agentskit/core'
import { decodeStoredMessages } from './decode'
import type { RedisClientAdapter, RedisConnectionConfig } from './redis-client'
import { createRedisClientAdapter } from './redis-client'

type MemoryOperationOptions = Parameters<ChatMemory['load']>[0]

/** Redis connection and key-prefix settings for chat memory. */
export interface RedisChatMemoryConfig extends RedisConnectionConfig {
  keyPrefix?: string
  conversationId?: string
}

function encodeMessages(messages: Message[]): string {
  return JSON.stringify(serializeMessages(messages))
}

function decodeMessages(json: string | null): Message[] {
  if (!json) return []
  return decodeStoredMessages(json, 'redisChatMemory')
}

/** Creates a chat memory that stores conversation snapshots in Redis.
 * @param config Redis URL or client and optional namespace settings.
 * @returns A chat memory backed by Redis.
 * @throws {MemoryError} When the optional Redis dependency is missing or cannot connect.
 */
export function redisChatMemory(config: RedisChatMemoryConfig): ChatMemory {
  const prefix = config.keyPrefix ?? 'agentskit:chat'
  const convId = config.conversationId ?? 'default'
  const key = `${prefix}:${convId}`
  let clientPromise: Promise<RedisClientAdapter> | null = null

  const getClient = (): Promise<RedisClientAdapter> => {
    if (config.client) return Promise.resolve(config.client)
    if (!clientPromise) clientPromise = createRedisClientAdapter(config.url)
    return clientPromise
  }

  return {
    async load(options?: MemoryOperationOptions) {
      options?.signal?.throwIfAborted()
      const client = await getClient()
      options?.signal?.throwIfAborted()
      const json = await client.get(key)
      return decodeMessages(json)
    },
    async save(messages, options?: MemoryOperationOptions) {
      options?.signal?.throwIfAborted()
      const client = await getClient()
      options?.signal?.throwIfAborted()
      await client.set(key, encodeMessages(messages))
    },
    async clear(options?: MemoryOperationOptions) {
      options?.signal?.throwIfAborted()
      const client = await getClient()
      options?.signal?.throwIfAborted()
      await client.del(key)
    },
  }
}
