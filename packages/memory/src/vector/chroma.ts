import { ErrorCodes, MemoryError } from '@agentskit/core'
import type { RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { remoteJson, type RemoteHttpConfig } from './http'

export interface ChromaConfig extends RemoteHttpConfig {
  /** Base URL of a running Chroma HTTP server. */
  url: string
  collection: string
  /** Chroma tenant. Defaults to `default_tenant`. */
  tenant?: string
  /** Chroma database. Defaults to `default_database`. */
  database?: string
  /** Chroma token sent through the `x-chroma-token` header. */
  apiKey?: string
  /** Additional headers for hosted or proxied Chroma deployments. */
  headers?: Record<string, string>
  topK?: number
}

async function call<T>(
  config: ChromaConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const headers = new Headers(config.headers)
  if (config.apiKey !== undefined) headers.set('x-chroma-token', config.apiKey)
  headers.set('content-type', 'application/json')
  return remoteJson<T>(config, 'chroma', `${config.url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function chroma(config: ChromaConfig): VectorMemory {
  const defaultTopK = Math.max(1, config.topK ?? 10)
  let urlEnd = config.url.length
  while (urlEnd > 0 && config.url.charCodeAt(urlEnd - 1) === 47) urlEnd--
  const resolvedConfig = { ...config, url: config.url.slice(0, urlEnd) }
  const tenant = encodeURIComponent(config.tenant ?? 'default_tenant')
  const database = encodeURIComponent(config.database ?? 'default_database')
  const collection = encodeURIComponent(config.collection)
  const collectionsPath = `/api/v2/tenants/${tenant}/databases/${database}/collections`
  let collectionIdPromise: Promise<string> | undefined

  function resolveCollectionId(): Promise<string> {
    collectionIdPromise ??= call<{ id?: string }>(
      resolvedConfig,
      'GET',
      `${collectionsPath}/${collection}`,
    ).then(result => {
      if (typeof result.id !== 'string' || result.id.length === 0) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_REMOTE_HTTP,
          message: 'chroma collection response did not include an id',
          hint: `Check collection ${config.collection} in tenant ${config.tenant ?? 'default_tenant'} and database ${config.database ?? 'default_database'}.`,
        })
      }
      return result.id
    }).catch(error => {
      collectionIdPromise = undefined
      throw error
    })
    return collectionIdPromise
  }

  async function collectionPath(operation: 'upsert' | 'query' | 'delete'): Promise<string> {
    const collectionId = encodeURIComponent(await resolveCollectionId())
    return `${collectionsPath}/${collectionId}/${operation}`
  }

  return {
    async store(docs: VectorDocument[]) {
      if (docs.length === 0) return
      await call(resolvedConfig, 'POST', await collectionPath('upsert'), {
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
      }>(resolvedConfig, 'POST', await collectionPath('query'), {
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
        .filter(r => (r.score ?? 0) > threshold)
    },

    async delete(ids: string[]) {
      if (ids.length === 0) return
      await call(resolvedConfig, 'POST', await collectionPath('delete'), { ids })
    },
  }
}
