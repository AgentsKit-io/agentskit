import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

export interface QdrantConfig {
  /** Base URL, e.g. `https://xxx.cluster-qdrant.io`. */
  url: string
  apiKey?: string
  collection: string
  topK?: number
  fetch?: typeof globalThis.fetch
}

async function call<T>(
  config: QdrantConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const response = await fetchImpl(`${config.url}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { 'api-key': config.apiKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`qdrant ${response.status}: ${text.slice(0, 200)}`)
  return (text.length > 0 ? JSON.parse(text) : {}) as T
}

export function qdrant(config: QdrantConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(config, 'PUT', `/collections/${config.collection}/points`, {
        points: docs.map(d => ({
          id: d.id,
          vector: d.embedding,
          payload: { content: d.content, ...(d.metadata ?? {}) },
        })),
      })
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const result = await call<{
        result?: Array<{
          id: string | number
          score: number
          payload?: Record<string, unknown>
        }>
      }>(config, 'POST', `/collections/${config.collection}/points/search`, {
        vector: embedding,
        limit: topK,
        with_payload: true,
      })
      return (result.result ?? [])
        .filter(m => m.score >= threshold)
        .map(m => ({
          id: String(m.id),
          content: String((m.payload ?? {}).content ?? ''),
          metadata: m.payload,
          score: m.score,
        }))
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      await call(config, 'POST', `/collections/${config.collection}/points/delete`, {
        points: ids,
      })
    },
  }
}
