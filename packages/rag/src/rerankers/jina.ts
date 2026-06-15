import { RagError, RagErrorCodes } from '../errors'
import type { RetrievedDocument } from '@agentskit/core'
import type { RerankFn } from '../rerank'

export interface JinaRerankerOptions {
  apiKey: string
  /** Default `jina-reranker-v2-base-multilingual`. */
  model?: string
  fetch?: typeof globalThis.fetch
}

interface JinaRerankResponse {
  results?: Array<{ index: number; relevance_score: number }>
  detail?: string
}

/**
 * Jina AI cross-encoder reranker. Drop-in `RerankFn` for
 * `createRerankedRetriever`.
 */
export function jinaReranker(options: JinaRerankerOptions): RerankFn {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const model = options.model ?? 'jina-reranker-v2-base-multilingual'
  return async ({ query, documents }) => {
    if (documents.length === 0) return documents
    const response = await fetchImpl('https://api.jina.ai/v1/rerank', {
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
      throw new RagError({ code: RagErrorCodes.AK_RAG_RERANK_FAILED, message: `jina rerank: ${response.status} ${text.slice(0, 200)}` })
    }
    const data = await response.json() as JinaRerankResponse
    const ranked: RetrievedDocument[] = (data.results ?? [])
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map(r => {
        const doc = documents[r.index]!
        return { ...doc, score: r.relevance_score }
      })
    return ranked
  }
}
