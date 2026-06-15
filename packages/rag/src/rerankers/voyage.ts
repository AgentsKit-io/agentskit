import { RagError, RagErrorCodes } from '../errors'
import type { RetrievedDocument } from '@agentskit/core'
import type { RerankFn } from '../rerank'

export interface VoyageRerankerOptions {
  apiKey: string
  /** Default `rerank-2`. Pass `rerank-2-lite` for cheaper / faster runs. */
  model?: string
  /** Override fetch (mainly for tests). */
  fetch?: typeof globalThis.fetch
}

interface VoyageRerankResponse {
  data?: Array<{ index: number; relevance_score: number }>
  detail?: string
}

/**
 * Voyage AI cross-encoder reranker. Drop-in `RerankFn` for
 * `createRerankedRetriever`.
 */
export function voyageReranker(options: VoyageRerankerOptions): RerankFn {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const model = options.model ?? 'rerank-2'
  return async ({ query, documents }) => {
    if (documents.length === 0) return documents
    const response = await fetchImpl('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        query,
        documents: documents.map(d => d.content),
        model,
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new RagError({ code: RagErrorCodes.AK_RAG_RERANK_FAILED, message: `voyage rerank: ${response.status} ${text.slice(0, 200)}` })
    }
    const data = await response.json() as VoyageRerankResponse
    const ranked: RetrievedDocument[] = (data.data ?? [])
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map(r => {
        const doc = documents[r.index]!
        return { ...doc, score: r.relevance_score }
      })
    return ranked
  }
}
