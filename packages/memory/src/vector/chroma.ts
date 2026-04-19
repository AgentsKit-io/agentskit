import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

export interface ChromaConfig {
  /** Base URL of a running Chroma HTTP server. */
  url: string
  collection: string
  topK?: number
  fetch?: typeof globalThis.fetch
}

async function call<T>(
  config: ChromaConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const response = await fetchImpl(`${config.url}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`chroma ${response.status}: ${text.slice(0, 200)}`)
  return (text.length > 0 ? JSON.parse(text) : {}) as T
}

export function chroma(config: ChromaConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(config, 'POST', `/api/v1/collections/${config.collection}/upsert`, {
        ids: docs.map(d => d.id),
        embeddings: docs.map(d => d.embedding),
        documents: docs.map(d => d.content),
        metadatas: docs.map(d => d.metadata ?? {}),
      })
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const result = await call<{
        ids?: string[][]
        documents?: string[][]
        metadatas?: Array<Array<Record<string, unknown>>>
        distances?: number[][]
      }>(config, 'POST', `/api/v1/collections/${config.collection}/query`, {
        query_embeddings: [embedding],
        n_results: topK,
      })
      const ids = result.ids?.[0] ?? []
      const documents = result.documents?.[0] ?? []
      const metadatas = result.metadatas?.[0] ?? []
      const distances = result.distances?.[0] ?? []
      return ids
        .map((id, i) => ({
          id,
          content: documents[i] ?? '',
          metadata: metadatas[i],
          score: distances[i] !== undefined ? 1 - distances[i]! : 0,
        }))
        .filter(r => (r.score ?? 0) >= threshold)
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      await call(config, 'POST', `/api/v1/collections/${config.collection}/delete`, { ids })
    },
  }
}
