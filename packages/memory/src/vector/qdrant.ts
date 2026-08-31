import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { remoteJson, type RemoteHttpConfig } from './http'
import { validateIdentifier } from './validation'

export interface QdrantConfig extends RemoteHttpConfig {
  /** Base URL, e.g. `https://xxx.cluster-qdrant.io`. */
  url: string
  apiKey?: string
  collection: string
  topK?: number
}

const qdrantSourceId = '__agentskitSourceId'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function qdrantPointId(id: string): Promise<string | number> {
  if (uuidPattern.test(id)) return id

  if (/^\d+$/.test(id)) {
    const numericId = Number(id)
    if (Number.isSafeInteger(numericId)) return numericId
  }

  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(id)),
  ).slice(0, 16)
  digest[6] = (digest[6]! & 0x0f) | 0x50
  digest[8] = (digest[8]! & 0x3f) | 0x80
  const hex = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function call<T>(
  config: QdrantConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  return remoteJson<T>(config, 'qdrant', `${config.url}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(config.apiKey ? { 'api-key': config.apiKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function qdrant(config: QdrantConfig): VectorMemory {
  const collection = encodeURIComponent(validateIdentifier(config.collection, 'collection'))
  const defaultTopK = Math.max(1, config.topK ?? 10)

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      const points = await Promise.all(docs.map(async d => ({
        id: await qdrantPointId(d.id),
        vector: d.embedding,
        payload: { content: d.content, ...(d.metadata ?? {}), [qdrantSourceId]: d.id },
      })))
      await call(config, 'PUT', `/collections/${collection}/points`, {
        points,
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
      }>(config, 'POST', `/collections/${collection}/points/search`, {
        vector: embedding,
        limit: topK,
        with_payload: true,
      })
      return (result.result ?? [])
        .filter(m => m.score >= threshold)
        .map(m => {
          const payload = { ...(m.payload ?? {}) }
          const sourceId = payload[qdrantSourceId]
          delete payload[qdrantSourceId]
          return {
            id: typeof sourceId === 'string' ? sourceId : String(m.id),
            content: String(payload.content ?? ''),
            metadata: payload,
            score: m.score,
          }
        })
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      const points = await Promise.all(ids.map(qdrantPointId))
      await call(config, 'POST', `/collections/${collection}/points/delete`, {
        points,
      })
    },
  }
}
