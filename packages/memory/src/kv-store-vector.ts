// vector KV backend — get/set by exact key (round-tripped through metadata),
// plus a `recall(query, k)` similarity search.

import { MemoryError } from '@agentskit/core'
import {
  isExpired,
  type AgentskitMemoryStore,
  type MemoryEmbedderLike,
  type MemoryVectorStoreLike,
  type VectorKvConfig,
  validateKvRetention,
} from './kv-store-types'

/** Dependencies for creating a vector-backed key-value store. */
export interface CreateVectorStoreOpts {
  readonly config: VectorKvConfig
  readonly vectorStore: MemoryVectorStoreLike
  readonly embedder: MemoryEmbedderLike
}

/** Creates a key-value store that embeds keys and stores values in a vector store.
 * @param options Vector config, store, and embedder.
 * @returns A key-value store with a similarity-based `recall` method.
 * @throws {MemoryError} When the embedder returns no vector.
 */
export const createVectorStore = ({
  config,
  vectorStore,
  embedder,
}: CreateVectorStoreOpts): AgentskitMemoryStore & { recall(query: string, k?: number): Promise<readonly unknown[]> } => {
  validateKvRetention(config)
  const collection = config.collection
  const isLive = (metadata: Record<string, unknown>, now: number) => {
    const insertedAt = metadata['__insertedAt']
    return metadata['__collection'] === collection &&
      (typeof insertedAt !== 'number' || !isExpired({ value: undefined, insertedAt }, config.ttlSeconds, now))
  }

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
      const hits = await vectorStore.query(vec, config.ttlSeconds === undefined ? 1 : 100, { __collection: collection, __key: key })
      const now = Date.now()
      const hit = hits.find(candidate => {
        return candidate.metadata['__key'] === key && isLive(candidate.metadata, now)
      })
      return hit?.metadata['__value']
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
      if (k <= 0) return []
      const vec = await embedOne(query)
      const hits = await vectorStore.query(vec, k + (config.ttlSeconds === undefined ? 0 : 100), { __collection: collection })
      const now = Date.now()
      const results: unknown[] = []
      for (const hit of hits) {
        if (!isLive(hit.metadata, now)) continue
        results.push(hit.metadata['__value'])
        if (results.length >= k) break
      }
      return results
    },
  }
}
