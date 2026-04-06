import type { VectorMemory, VectorDocument, RetrievedDocument } from '@agentskit/core'
import type { RedisClientAdapter, RedisConnectionConfig } from './redis-client'
import { createRedisClientAdapter } from './redis-client'

export interface RedisVectorMemoryConfig extends RedisConnectionConfig {
  indexName?: string
  keyPrefix?: string
  dimensions?: number
}

function float32Buffer(vector: number[]): Buffer {
  const buffer = Buffer.alloc(vector.length * 4)
  for (let i = 0; i < vector.length; i++) {
    buffer.writeFloatLE(vector[i], i * 4)
  }
  return buffer
}

export function redisVectorMemory(config: RedisVectorMemoryConfig): VectorMemory {
  const indexName = config.indexName ?? 'agentskit:vectors:idx'
  const prefix = config.keyPrefix ?? 'agentskit:vec'
  const dimensions = config.dimensions ?? 0
  let clientPromise: Promise<RedisClientAdapter> | null = null
  let indexCreated = false

  const getClient = (): Promise<RedisClientAdapter> => {
    if (config.client) return Promise.resolve(config.client)
    if (!clientPromise) clientPromise = createRedisClientAdapter(config.url)
    return clientPromise
  }

  const ensureIndex = async (client: RedisClientAdapter, dims: number) => {
    if (indexCreated) return
    try {
      await client.call(
        'FT.CREATE', indexName,
        'ON', 'HASH',
        'PREFIX', '1', `${prefix}:`,
        'SCHEMA',
        'content', 'TEXT',
        'metadata', 'TEXT',
        'embedding', 'VECTOR', 'HNSW', '6',
        'TYPE', 'FLOAT32',
        'DIM', dims,
        'DISTANCE_METRIC', 'COSINE',
      )
    } catch (err: unknown) {
      const msg = String(err)
      if (!msg.includes('Index already exists')) throw err
    }
    indexCreated = true
  }

  return {
    async store(docs: VectorDocument[]) {
      const client = await getClient()
      const dims = dimensions || docs[0]?.embedding.length || 0
      if (dims > 0) await ensureIndex(client, dims)

      for (const doc of docs) {
        const key = `${prefix}:${doc.id}`
        await client.call(
          'HSET', key,
          'content', doc.content,
          'metadata', JSON.stringify(doc.metadata ?? {}),
          'embedding', float32Buffer(doc.embedding),
        )
      }
    },
    async search(embedding, options) {
      const client = await getClient()
      const topK = options?.topK ?? 5
      const threshold = options?.threshold ?? 0

      const result = await client.call(
        'FT.SEARCH', indexName,
        `*=>[KNN ${topK} @embedding $vec AS score]`,
        'PARAMS', '2', 'vec', float32Buffer(embedding),
        'SORTBY', 'score',
        'RETURN', '3', 'content', 'metadata', 'score',
        'DIALECT', '2',
      ) as unknown[]

      if (!Array.isArray(result) || result.length < 2) return []

      const docs: RetrievedDocument[] = []
      // FT.SEARCH returns [total, key1, [field, val, ...], key2, [field, val, ...], ...]
      for (let i = 1; i < result.length; i += 2) {
        const key = String(result[i])
        const fields = result[i + 1] as string[]
        if (!Array.isArray(fields)) continue

        const fieldMap: Record<string, string> = {}
        for (let j = 0; j < fields.length; j += 2) {
          fieldMap[fields[j]] = fields[j + 1]
        }

        const score = 1 - parseFloat(fieldMap.score ?? '1') // COSINE distance → similarity
        if (score < threshold) continue

        docs.push({
          id: key.replace(`${prefix}:`, ''),
          content: fieldMap.content ?? '',
          score,
          metadata: fieldMap.metadata ? JSON.parse(fieldMap.metadata) : undefined,
        })
      }

      return docs
    },
    async delete(ids) {
      const client = await getClient()
      await client.del(ids.map(id => `${prefix}:${id}`))
    },
  }
}
