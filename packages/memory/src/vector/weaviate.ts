import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { remoteJson, type RemoteHttpConfig } from './http'
import { validateIdentifier } from './validation'

export interface WeaviateConfig extends RemoteHttpConfig {
  /** Cluster URL, e.g. `https://my-cluster.weaviate.network`. */
  url: string
  /** Optional API key (Weaviate Cloud Services). */
  apiKey?: string
  /** Class name in the Weaviate schema. */
  className: string
  topK?: number
}

async function call<T>(
  config: WeaviateConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  return remoteJson<T>(config, 'weaviate', `${config.url}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function weaviateVectorStore(config: WeaviateConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)
  const className = validateIdentifier(config.className, 'className')

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
        await call(config, 'DELETE', `/v1/objects/${className}/${encodeURIComponent(id)}`)
      }
    },
  }
}
