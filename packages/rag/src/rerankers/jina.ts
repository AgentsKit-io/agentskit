import { RagError, RagErrorCodes } from '../errors'
import type { RetrievedDocument } from '@agentskit/core'
import type { RerankFn } from '../rerank'

export interface JinaRerankerOptions {
  apiKey: string
  /** Default `jina-reranker-v2-base-multilingual`. */
  model?: string
  fetch?: typeof globalThis.fetch
  /** Optional abort signal forwarded to the underlying HTTP request. */
  signal?: AbortSignal
}

interface JinaRerankResponse {
  results?: Array<{ index: number; relevance_score: number }>
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
 * Jina AI cross-encoder reranker. Drop-in `RerankFn` for
 * `createRerankedRetriever`.
 */
export function jinaReranker(options: JinaRerankerOptions): RerankFn {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const model = options.model ?? 'jina-reranker-v2-base-multilingual'
  return async ({ query, documents }) => {
    if (documents.length === 0) return documents
    let response: Response
    try {
      response = await fetchImpl('https://api.jina.ai/v1/rerank', {
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
      throw rerankFailed('jina rerank: network error', cause)
    }
    if (!response.ok) {
      let text = ''
      try {
        text = await response.text()
      } catch (cause) {
        throw rerankFailed(`jina rerank: ${response.status} (failed to read error body)`, cause)
      }
      throw rerankFailed(`jina rerank: ${response.status} ${text.slice(0, 200)}`)
    }

    let data: JinaRerankResponse
    try {
      data = await response.json() as JinaRerankResponse
    } catch (cause) {
      throw rerankFailed('jina rerank: invalid JSON response', cause)
    }

    if (!Array.isArray(data.results)) {
      throw rerankFailed('jina rerank: results must be an array')
    }

    const ranked: RetrievedDocument[] = []
    for (let i = 0; i < data.results.length; i++) {
      const r = data.results[i]!
      if (
        r == null ||
        typeof r !== 'object' ||
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= documents.length ||
        typeof r.relevance_score !== 'number' ||
        !Number.isFinite(r.relevance_score)
      ) {
        throw rerankFailed(`jina rerank: malformed result at index ${i}`)
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
