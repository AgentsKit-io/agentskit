import { RagError, RagErrorCodes } from '../errors'
import type { RetrievedDocument } from '@agentskit/core'
import type { RerankFn } from '../rerank'

export interface VoyageRerankerOptions {
  apiKey: string
  /** Default `rerank-2`. Pass `rerank-2-lite` for cheaper / faster runs. */
  model?: string
  /** Override fetch (mainly for tests). */
  fetch?: typeof globalThis.fetch
  /** Optional abort signal forwarded to the underlying HTTP request. */
  signal?: AbortSignal
}

interface VoyageRerankResponse {
  data?: Array<{ index: number; relevance_score: number }>
  detail?: string
}

function rerankFailed(message: string, cause?: unknown): RagError {
  return new RagError({
    code: RagErrorCodes.AK_RAG_RERANK_FAILED,
    message,
    cause,
  })
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
    let response: Response
    try {
      response = await fetchImpl('https://api.voyageai.com/v1/rerank', {
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
        signal: options.signal,
      })
    } catch (cause) {
      throw rerankFailed('voyage rerank: network error', cause)
    }
    if (!response.ok) {
      let text = ''
      try {
        text = await response.text()
      } catch (cause) {
        throw rerankFailed(`voyage rerank: ${response.status} (failed to read error body)`, cause)
      }
      throw rerankFailed(`voyage rerank: ${response.status} ${text.slice(0, 200)}`)
    }

    let data: VoyageRerankResponse
    try {
      data = await response.json() as VoyageRerankResponse
    } catch (cause) {
      throw rerankFailed('voyage rerank: invalid JSON response', cause)
    }

    if (!Array.isArray(data.data)) {
      throw rerankFailed('voyage rerank: data must be an array')
    }

    const ranked: RetrievedDocument[] = []
    for (let i = 0; i < data.data.length; i++) {
      const r = data.data[i]!
      if (
        r == null ||
        typeof r !== 'object' ||
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= documents.length ||
        typeof r.relevance_score !== 'number' ||
        !Number.isFinite(r.relevance_score)
      ) {
        throw rerankFailed(`voyage rerank: malformed result at index ${i}`)
      }
      const doc = documents[r.index]!
      ranked.push({
        ...doc,
        metadata: doc.metadata ? { ...doc.metadata } : undefined,
        score: r.relevance_score,
      })
    }

    ranked.sort((a, b) => (b.score as number) - (a.score as number))
    return ranked
  }
}
