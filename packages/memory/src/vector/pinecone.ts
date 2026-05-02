import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

export interface PineconeConfig {
  /** Full index URL, e.g. `https://<idx>-<project>.svc.<region>.pinecone.io`. */
  indexUrl: string
  apiKey: string
  /** Namespace. Default ''. */
  namespace?: string
  /** Default topK for search. Default 10. */
  topK?: number
  fetch?: typeof globalThis.fetch
}

async function call<T>(config: PineconeConfig, path: string, body: unknown): Promise<T> {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const response = await fetchImpl(`${config.indexUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
      message: `pinecone ${response.status}: ${text.slice(0, 200)}`,
      hint: `URL ${config.indexUrl}${path}. Check api-key + index URL/namespace.`,
    })
  }
  return (text.length > 0 ? JSON.parse(text) : {}) as T
}

export function pinecone(config: PineconeConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)
  const namespace = config.namespace ?? ''

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(config, '/vectors/upsert', {
        namespace,
        vectors: docs.map(d => ({
          id: d.id,
          values: d.embedding,
          metadata: { content: d.content, ...(d.metadata ?? {}) },
        })),
      })
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const result = await call<{
        matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
      }>(config, '/query', {
        namespace,
        topK,
        vector: embedding,
        includeMetadata: true,
      })
      return (result.matches ?? [])
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
      await call(config, '/vectors/delete', { namespace, ids })
    },
  }
}
