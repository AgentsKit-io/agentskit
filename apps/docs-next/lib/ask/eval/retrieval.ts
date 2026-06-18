/**
 * Deterministic retrieval eval for the Ask-the-docs RAG layer.
 *
 * NO LLM. For each golden case we run the real `createDocsRetriever()` over the
 * committed index and check whether the case's `expected_paths` show up in the
 * retrieved chunks' `metadata.path`. Two metrics:
 *
 *   - recall@k : fraction of cases where AT LEAST ONE expected path appears in
 *                the top-k retrieved doc paths. ("Did we surface the right page?")
 *   - MRR      : mean reciprocal rank — 1/rank of the first retrieved chunk whose
 *                path is an expected path (0 if none). Rewards ranking the right
 *                page near the top, not just somewhere in the list.
 *
 * Both are computed only from retrieval output, so the result is stable across
 * runs (the ONNX embedder is deterministic). The first run downloads the model;
 * later runs reuse the in-process cache.
 */
import type { RetrievedDocument, Retriever } from '@agentskit/core'
import { createDocsRetriever } from '@/lib/rag/retrieve'
import { loadGolden, type GoldenCase } from './dataset'

/** Default k — matches the route's TOP_K (6 reranked chunks to the prompt). */
export const DEFAULT_K = 6

export interface RetrievalCaseResult {
  question: string
  expectedPaths: string[]
  /** Doc paths actually retrieved, in rank order. */
  retrievedPaths: string[]
  /** True when ≥1 expected path was retrieved within k. */
  hit: boolean
  /** 1-based rank of the first expected path (0 = not found). */
  firstHitRank: number
  /** 1/firstHitRank (0 when not found). */
  reciprocalRank: number
}

export interface RetrievalEvalResult {
  k: number
  totalCases: number
  /** Mean of per-case hits. */
  recallAtK: number
  /** Mean reciprocal rank across all cases. */
  mrr: number
  perCase: RetrievalCaseResult[]
}

/** Pull the docs path out of a retrieved chunk's metadata. */
function pathOf(doc: RetrievedDocument): string | undefined {
  const p = (doc.metadata as { path?: unknown } | undefined)?.path
  return typeof p === 'string' ? p : undefined
}

function scoreCase(
  testCase: GoldenCase,
  retrieved: RetrievedDocument[],
  k: number,
): RetrievalCaseResult {
  const expected = new Set(testCase.expected_paths)
  const retrievedPaths = retrieved
    .slice(0, k)
    .map(pathOf)
    .filter((p): p is string => typeof p === 'string')

  let firstHitRank = 0
  for (let i = 0; i < retrievedPaths.length; i++) {
    if (expected.has(retrievedPaths[i]!)) {
      firstHitRank = i + 1
      break
    }
  }

  return {
    question: testCase.question,
    expectedPaths: testCase.expected_paths,
    retrievedPaths,
    hit: firstHitRank > 0,
    firstHitRank,
    reciprocalRank: firstHitRank > 0 ? 1 / firstHitRank : 0,
  }
}

export interface RunRetrievalEvalOptions {
  /** Top-k cutoff. Defaults to DEFAULT_K (6). */
  k?: number
  /** Inject a retriever (tests). Defaults to the real docs retriever. */
  retriever?: Retriever
}

/**
 * Run the deterministic retrieval eval over the golden set. Resolves with
 * aggregate recall@k + MRR plus the per-case breakdown.
 */
export async function runRetrievalEval(
  options: RunRetrievalEvalOptions = {},
): Promise<RetrievalEvalResult> {
  const k = options.k ?? DEFAULT_K
  const retriever = options.retriever ?? createDocsRetriever()
  const golden = await loadGolden()

  const perCase: RetrievalCaseResult[] = []
  for (const testCase of golden) {
    const retrieved = await retriever.retrieve({ query: testCase.question, messages: [] })
    perCase.push(scoreCase(testCase, retrieved, k))
  }

  const n = perCase.length
  const recallAtK = n === 0 ? 0 : perCase.filter((c) => c.hit).length / n
  const mrr = n === 0 ? 0 : perCase.reduce((sum, c) => sum + c.reciprocalRank, 0) / n

  return { k, totalCases: n, recallAtK, mrr, perCase }
}

// CLI entry: `tsx lib/ask/eval/retrieval.ts` (downloads the ONNX model on first run).
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  runRetrievalEval()
    .then((r) => {
      console.log(`recall@${r.k}: ${(r.recallAtK * 100).toFixed(1)}%`)
      console.log(`MRR:       ${r.mrr.toFixed(3)}`)
      console.log(`cases:     ${r.totalCases}`)
    })
    .catch((err) => {
      console.error('[retrieval-eval] crashed:', err)
      process.exit(1)
    })
}
