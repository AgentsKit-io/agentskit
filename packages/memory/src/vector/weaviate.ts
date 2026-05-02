import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

export interface WeaviateConfig {
  /** Cluster URL, e.g. `https://my-cluster.weaviate.network`. */
  url: string
  /** Optional API key (Weaviate Cloud Services). */
  apiKey?: string
  /** Class name in the Weaviate schema. */
  className: string
  topK?: number
  fetch?: typeof globalThis.fetch
}

async function call<T>(
  config: WeaviateConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const response = await fetchImpl(`${config.url}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
      message: `weaviate ${response.status}: ${text.slice(0, 200)}`,
      hint: `URL ${config.url}${path}. Check API key + class name "${config.className}".`,
    })
  }
  return (text.length > 0 ? JSON.parse(text) : {}) as T
}

export function weaviateVectorStore(config: WeaviateConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)
  const className = config.className

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(config, 'POST', '/v1/batch/objects', {
        objects: docs.map(d => ({
          class: className,
          id: d.id,
          properties: { content: d.content, ...(d.metadata ?? {}) },
          vector: d.embedding,
        })),
      })
    },

    async search(embedding: number[], options = {}): Promise<RetrievedDocument[]> {
      const topK = options.topK ?? defaultTopK
      const threshold = options.threshold ?? 0
      const query = `{
        Get {
          ${className}(nearVector: { vector: [${embedding.join(',')}] }, limit: ${topK}) {
            content
            _additional { id certainty }
          }
        }
      }`
      const result = await call<{
        data?: { Get?: Record<string, Array<{ content?: string; _additional?: { id: string; certainty?: number } } & Record<string, unknown>>> }
      }>(config, 'POST', '/v1/graphql', { query })
      const rows = result.data?.Get?.[className] ?? []
      return rows
        .map(row => ({
          id: String(row._additional?.id ?? ''),
          content: String(row.content ?? ''),
          score: row._additional?.certainty ?? 0,
          metadata: row,
        }))
        .filter(r => (r.score ?? 0) >= threshold)
    },

    async delete(ids: string[]) {
      for (const id of ids) {
        await call(config, 'DELETE', `/v1/objects/${className}/${id}`)
      }
    },
  }
}
