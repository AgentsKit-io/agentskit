// vector KV backend — get/set by exact key (round-tripped through metadata),
// plus a `recall(query, k)` similarity search.

import { MemoryError } from '@agentskit/core'
import {
  isExpired,
  type AgentskitMemoryStore,
  type MemoryEmbedderLike,
  type MemoryVectorStoreLike,
  type VectorKvConfig,
} from './kv-store-types'

export interface CreateVectorStoreOpts {
  readonly config: VectorKvConfig
  readonly vectorStore: MemoryVectorStoreLike
  readonly embedder: MemoryEmbedderLike
}

export const createVectorStore = ({
  config,
  vectorStore,
  embedder,
}: CreateVectorStoreOpts): AgentskitMemoryStore & { recall(query: string, k?: number): Promise<readonly unknown[]> } => {
  const collection = config.collection

  const embedOne = async (text: string): Promise<number[]> => {
    const [vec] = await embedder.embed([text])
    if (vec === undefined) {
      throw new MemoryError({
        code: 'AK_MEMORY_VECTOR_EMBEDDER_REQUIRED',
        message: 'createVectorStore: embedder returned no vector for the input text.',
      })
    }
    return vec
  }

  return {
    id: `vector:${config.provider}:${collection}`,
    async get(key) {
      const vec = await embedOne(key)
      const hits = await vectorStore.query(vec, 1, { __collection: collection, __key: key })
      const hit = hits[0]
      if (hit === undefined) return undefined
      if (hit.metadata['__key'] !== key) return undefined
      const insertedAt = hit.metadata['__insertedAt']
      if (typeof insertedAt === 'number' && isExpired({ value: undefined, insertedAt }, config.ttlSeconds, Date.now())) {
        return undefined
      }
      return hit.metadata['__value']
    },
    async set(key, value) {
      const vec = await embedOne(key)
      await vectorStore.upsert([
        {
          chunkId: `${collection}:${key}`,
          vec,
          metadata: { __collection: collection, __key: key, __value: value, __insertedAt: Date.now() },
        },
      ])
    },
    async recall(query, k = 5) {
      const vec = await embedOne(query)
      const hits = await vectorStore.query(vec, k, { __collection: collection })
      const now = Date.now()
      const results: unknown[] = []
      for (const hit of hits) {
        const insertedAt = hit.metadata['__insertedAt']
        if (typeof insertedAt === 'number' && isExpired({ value: undefined, insertedAt }, config.ttlSeconds, now)) {
          continue
        }
        results.push(hit.metadata['__value'])
      }
      return results
    },
  }
}
