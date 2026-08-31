import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { remoteJson, type RemoteHttpConfig } from './http'

export interface UpstashVectorConfig extends RemoteHttpConfig {
  url: string
  token: string
  topK?: number
}

async function call<T>(
  config: UpstashVectorConfig,
  path: string,
  body: unknown,
): Promise<T> {
  return remoteJson<T>(config, 'upstash-vector', `${config.url}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body),
  })
}

/**
 * Upstash Vector — HTTP-only serverless vector DB. The REST surface
 * is tiny enough to implement directly without pulling the SDK.
 */
export function upstashVector(config: UpstashVectorConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(
        config,
        '/upsert',
        docs.map(d => ({
          id: d.id,
          vector: d.embedding,
          metadata: { content: d.content, ...(d.metadata ?? {}) },
        })),
      )
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const result = await call<{
        result?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
      }>(config, '/query', { vector: embedding, topK, includeMetadata: true })
      return (result.result ?? [])
        .filter(m => m.score >= threshold)
        .map(m => ({
          id: m.id,
          content: String((m.metadata ?? {}).content ?? ''),
          metadata: m.metadata,
          score: m.score,
        }))
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      await call(config, '/delete', { ids })
    },
  }
}
