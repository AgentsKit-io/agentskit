import type { ChatMemory, Message, MemoryRecord } from '@agentskit/core'
import type { RedisClientAdapter, RedisConnectionConfig } from './redis-client'
import { createRedisClientAdapter } from './redis-client'

export interface RedisChatMemoryConfig extends RedisConnectionConfig {
  keyPrefix?: string
  conversationId?: string
}

function serializeMessages(messages: Message[]): string {
  const record: MemoryRecord = {
    version: 1,
    messages: messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  }
  return JSON.stringify(record)
}

function deserializeMessages(json: string | null): Message[] {
  if (!json) return []
  try {
    const record = JSON.parse(json) as MemoryRecord
    if (!record?.messages) return []
    return record.messages.map(m => ({
      ...m,
      createdAt: new Date(m.createdAt),
    }))
  } catch {
    return []
  }
}

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
    async load() {
      const client = await getClient()
      const json = await client.get(key)
      return deserializeMessages(json)
    },
    async save(messages) {
      const client = await getClient()
      await client.set(key, serializeMessages(messages))
    },
    async clear() {
      const client = await getClient()
      await client.del(key)
    },
  }
}
