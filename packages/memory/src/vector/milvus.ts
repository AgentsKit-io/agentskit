import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { remoteJson, type RemoteHttpConfig } from './http'
import { validateIdentifier } from './validation'

export interface MilvusConfig extends RemoteHttpConfig {
  /** Milvus REST endpoint, e.g. `https://in03-xxx.api.gcp-us-west1.zillizcloud.com`. */
  url: string
  /** API key / Zilliz Cloud token (Bearer). */
  token?: string
  collection: string
  /** Vector field name in the schema. Default `vector`. */
  vectorField?: string
  topK?: number
}

async function call<T>(
  config: MilvusConfig,
  path: string,
  body: unknown,
): Promise<T> {
  return remoteJson<T>(config, 'milvus', `${config.url}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

export function milvusVectorStore(config: MilvusConfig): VectorMemory {
  const collection = validateIdentifier(config.collection, 'collection')
  const defaultTopK = Math.max(1, config.topK ?? 10)
  const vectorField = config.vectorField ?? 'vector'

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(config, '/v2/vectordb/entities/upsert', {
        collectionName: collection,
        data: docs.map(d => ({
          id: d.id,
          [vectorField]: d.embedding,
          content: d.content,
          metadata: d.metadata ?? {},
        })),
      })
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const result = await call<{
        data?: Array<{ id: string; distance: number; content?: string; metadata?: Record<string, unknown> }>
      }>(config, '/v2/vectordb/entities/search', {
        collectionName: collection,
        data: [embedding],
        annsField: vectorField,
        limit: topK,
        outputFields: ['content', 'metadata'],
      })
      return (result.data ?? [])
        .map(m => ({
          id: String(m.id),
          content: String(m.content ?? ''),
          score: 1 - m.distance,
          metadata: m.metadata,
        }))
        .filter(r => (r.score ?? 0) >= threshold)
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      await call(config, '/v2/vectordb/entities/delete', {
        collectionName: collection,
        filter: `id in [${ids.map(id => `"${id}"`).join(',')}]`,
      })
    },
  }
}
