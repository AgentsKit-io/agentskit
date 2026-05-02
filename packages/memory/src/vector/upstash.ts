import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'

export interface UpstashVectorConfig {
  url: string
  token: string
  topK?: number
  fetch?: typeof globalThis.fetch
}

async function call<T>(
  config: UpstashVectorConfig,
  path: string,
  body: unknown,
): Promise<T> {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const response = await fetchImpl(`${config.url}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
      message: `upstash-vector ${response.status}: ${text.slice(0, 200)}`,
      hint: `URL ${config.url}${path}. Check token + index URL.`,
    })
  }
  return (text.length > 0 ? JSON.parse(text) : {}) as T
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
