import type { RetrievedDocument, Retriever, RetrieverRequest } from '@agentskit/core'
import { RagError, RagErrorCodes } from './errors'

export type RerankFn = (
  input: { query: string; documents: RetrievedDocument[] },
) => Promise<RetrievedDocument[]> | RetrievedDocument[]

export interface RerankedRetrieverOptions {
  /** Pull N candidates from the base retriever before reranking. Default 20. */
  candidatePool?: number
  /** Return top-K after reranking. Default 5. */
  topK?: number
  /** Reranker implementation. Default: the built-in `bm25Rerank`. */
  rerank?: RerankFn
}

function resolvePositiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.floor(value))
}

function resolveWeight(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) return fallback
  return value
}

/** Non-negative finite relative pair summing to 1. Both zero → 0.5/0.5. */
function resolveRelativeWeights(
  vectorWeight: number | undefined,
  bm25Weight: number | undefined,
): { vectorWeight: number; bm25Weight: number } {
  const v = resolveWeight(vectorWeight, 0.6)
  const b = resolveWeight(bm25Weight, 0.4)
  if (v === 0 && b === 0) return { vectorWeight: 0.5, bm25Weight: 0.5 }
  // Scale by max so MAX_VALUE + MAX_VALUE never produces Infinity intermediates.
  const m = Math.max(v, b)
  const vN = v / m
  const bN = b / m
  const sum = vN + bN
  return { vectorWeight: vN / sum, bm25Weight: bN / sum }
}

function cloneDoc(doc: RetrievedDocument): RetrievedDocument {
  return {
    ...doc,
    metadata: doc.metadata ? { ...doc.metadata } : undefined,
  }
}

function rerankFailed(message: string, cause?: unknown): RagError {
  return new RagError({
    code: RagErrorCodes.AK_RAG_RERANK_FAILED,
    message,
    cause,
  })
}

/**
 * Scoreless lists keep order. If any score is present, every document must
 * have a finite numeric score and the list is sorted descending. Never
 * fabricates -Infinity for missing scores.
 */
function enforceScoreOrder(docs: RetrievedDocument[]): RetrievedDocument[] {
  if (docs.length === 0) return docs
  const anyScore = docs.some(d => d.score !== undefined)
  if (!anyScore) return docs.map(cloneDoc)

  for (const d of docs) {
    if (typeof d.score !== 'number' || !Number.isFinite(d.score)) {
      throw rerankFailed(
        'reranker output: every document must have a finite numeric score when scores are present',
      )
    }
  }

  return docs
    .map(cloneDoc)
    .sort((a, b) => (b.score as number) - (a.score as number))
}

function validateRerankOutput(value: unknown): RetrievedDocument[] {
  if (!Array.isArray(value)) {
    throw rerankFailed('reranker output must be an array of documents')
  }

  const out: RetrievedDocument[] = []
  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    if (item == null || typeof item !== 'object') {
      throw rerankFailed(`reranker output[${i}] is not a document object`)
    }
    const doc = item as Partial<RetrievedDocument>
    if (typeof doc.id !== 'string' || typeof doc.content !== 'string') {
      throw rerankFailed(`reranker output[${i}] must have string id and content`)
    }
    if (
      doc.score !== undefined &&
      (typeof doc.score !== 'number' || !Number.isFinite(doc.score))
    ) {
      throw rerankFailed(`reranker output[${i}] has a non-finite score`)
    }
    out.push(cloneDoc(doc as RetrievedDocument))
  }
  return out
}

/**
 * Wrap any base `Retriever` with a reranker. Typical flow:
 *   1. Vector search returns ~20 candidates (`candidatePool`)
 *   2. `rerank` re-scores them with a stronger signal (Cohere Rerank,
 *      BGE cross-encoder, or BM25 for keyword-aware hybrid search)
 *   3. Top `topK` are returned
 */
export function createRerankedRetriever(
  base: Retriever,
  options: RerankedRetrieverOptions = {},
): Retriever {
  const candidatePool = resolvePositiveInt(options.candidatePool, 20)
  const topK = resolvePositiveInt(options.topK, 5)
  const rerank = options.rerank ?? bm25Rerank

  return {
    async retrieve(request: RetrieverRequest) {
      const baseResults = await base.retrieve(request)
      const candidates = baseResults.slice(0, candidatePool).map(cloneDoc)
      let reranked: unknown
      try {
        reranked = await rerank({ query: request.query, documents: candidates })
      } catch (cause) {
        if (cause instanceof RagError) throw cause
        throw rerankFailed('reranker threw', cause)
      }
      const validated = validateRerankOutput(reranked)
      const ordered = enforceScoreOrder(validated)
      return ordered.slice(0, topK)
    },
  }
}

// ---------------------------------------------------------------------------
// BM25 — standalone scorer + a RerankFn using it
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 0)
}

export interface BM25Options {
  /** Term-frequency saturation (k1 ≥ 0). Default 1.5; invalid → default. */
  k1?: number
  /** Length-normalization weight in [0, 1]. Default 0.75; invalid → default. */
  b?: number
}

function resolveBm25K1(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) return 1.5
  return value
}

function resolveBm25B(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > 1) return 0.75
  return value
}

/**
 * Score a set of documents against a query using classic BM25.
 * Returns new document objects with a finite `.score` field, sorted descending.
 * Input documents are never mutated.
 */
export function bm25Score(
  query: string,
  documents: RetrievedDocument[],
  options: BM25Options = {},
): RetrievedDocument[] {
  const k1 = resolveBm25K1(options.k1)
  const b = resolveBm25B(options.b)
  const qTerms = tokenize(query)
  const N = documents.length
  if (N === 0 || qTerms.length === 0) return documents.map(cloneDoc)

  const docTerms = documents.map(d => tokenize(d.content))
  const avgdl = docTerms.reduce((acc, t) => acc + t.length, 0) / N

  const df = new Map<string, number>()
  for (const terms of docTerms) {
    const seen = new Set(terms)
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1)
  }

  const scored = documents.map((doc, i) => {
    const terms = docTerms[i]!
    const dl = terms.length
    const tf = new Map<string, number>()
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1)

    let score = 0
    for (const q of qTerms) {
      const f = tf.get(q) ?? 0
      if (f === 0) continue
      const n = df.get(q) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      const norm = 1 - b + b * (dl / (avgdl || 1))
      const denom = f + k1 * norm
      if (denom === 0) continue
      const term = idf * ((f * (k1 + 1)) / denom)
      if (Number.isFinite(term)) score += term
    }
    return { ...cloneDoc(doc), score: Number.isFinite(score) ? score : 0 }
  })

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

/** `RerankFn` backed by `bm25Score`. */
export const bm25Rerank: RerankFn = ({ query, documents }) => bm25Score(query, documents)

// ---------------------------------------------------------------------------
// Hybrid search — merge a vector retriever with a keyword (BM25) pass
// ---------------------------------------------------------------------------

export interface HybridRetrieverOptions {
  /** Relative weight of the vector score in the final ranking. Default 0.6. */
  vectorWeight?: number
  /** Relative weight of the BM25 score. Default 0.4. */
  bm25Weight?: number
  /** topK emitted after merging. Default 5. */
  topK?: number
  /** Candidate pool to pull from the base retriever. Default 20. */
  candidatePool?: number
}

/** Min-max normalize finite scores into [0, 1]. First id wins on duplicates. */
function normalize(docs: RetrievedDocument[]): Map<string, number> {
  const entries: Array<{ id: string; score: number }> = []
  for (const d of docs) {
    const raw = d.score
    const score = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
    entries.push({ id: d.id, score })
  }

  const scores = entries.map(e => e.score)
  const min = scores.length > 0 ? Math.min(...scores) : 0
  const max = scores.length > 0 ? Math.max(...scores) : 0
  const range = max - min

  const map = new Map<string, number>()
  for (const e of entries) {
    if (map.has(e.id)) continue
    if (range > 0) {
      map.set(e.id, (e.score - min) / range)
    } else {
      // Constant scores: all zero → 0; any other constant → 1.
      map.set(e.id, max === 0 ? 0 : 1)
    }
  }
  return map
}

/**
 * Combine a vector-backed `base` retriever with a BM25 keyword pass
 * over the same candidate pool. Final score is a weighted sum of the
 * two min-max-normalized scores using a finite relative weight pair
 * that sums to 1 (both zero → 0.5/0.5).
 */
export function createHybridRetriever(
  base: Retriever,
  options: HybridRetrieverOptions = {},
): Retriever {
  const { vectorWeight, bm25Weight } = resolveRelativeWeights(
    options.vectorWeight,
    options.bm25Weight,
  )
  const topK = resolvePositiveInt(options.topK, 5)
  const candidatePool = resolvePositiveInt(options.candidatePool, 20)

  return {
    async retrieve(request: RetrieverRequest) {
      const baseResults = await base.retrieve(request)
      const candidates = baseResults.slice(0, candidatePool).map(cloneDoc)
      if (candidates.length === 0) return candidates

      const vectorScores = normalize(candidates)
      const bm25Docs = bm25Score(request.query, candidates)
      const bm25Scores = normalize(bm25Docs)

      const merged: RetrievedDocument[] = candidates.map(d => {
        const raw =
          vectorWeight * (vectorScores.get(d.id) ?? 0) +
          bm25Weight * (bm25Scores.get(d.id) ?? 0)
        return {
          ...d,
          score: Number.isFinite(raw) ? raw : 0,
        }
      })

      merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      return merged.slice(0, topK)
    },
  }
}
