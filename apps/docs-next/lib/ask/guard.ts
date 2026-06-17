/**
 * Scope guard + message sanitizer for the Ask-the-docs route.
 *
 * `checkScope` is a cheap, on-device pre-filter that keeps obviously off-topic
 * questions (the "what stock should I buy" class) from spending a model call. It
 * embeds the query with the same local ONNX model used for retrieval
 * (lib/rag/embed) and compares it — by cosine similarity — against the *centroid*
 * of the committed docs corpus. The centroid is the mean of every chunk
 * embedding (re-normalized), i.e. the "average direction" of the docs. A query
 * close to that direction is on-topic; one far from it is not.
 *
 * Design notes:
 * - Embeddings are L2-normalized at embed time, so cosine == dot product.
 * - The centroid is computed once from the committed index and cached in-process.
 * - The corpus is intentionally broad, so a single global threshold is enough.
 *   ON_TOPIC_THRESHOLD is conservative (only clearly-distant queries are
 *   rejected) — we'd rather let a borderline query through to retrieval (which
 *   can still answer "not covered") than wrongly block a real docs question.
 * - If the committed index is empty (centroid undefined), we FAIL OPEN: every
 *   query is treated as in-scope. The guard is an optimization, never a
 *   correctness gate — retrieval + the grounded skill remain the real backstop.
 *
 * `sanitizeMessages` strips any client-supplied system role (we inject our own
 * grounded prompt) and caps both history length and per-message size.
 */
import type { EmbedFn, Message } from '@agentskit/core'
import { embed as defaultEmbed } from '../rag/embed'
import snapshot from '../ask-index/index.json'

interface IndexRecord {
  embedding: number[]
}
interface IndexSnapshot {
  records: IndexRecord[]
}

/**
 * Cosine cutoff below which a query is considered off-topic. BGE-small query↔
 * centroid cosines for genuine docs questions sit comfortably above this; pure
 * off-domain questions fall well below. Kept low on purpose (see file header).
 */
export const ON_TOPIC_THRESHOLD = 0.28

/** Max turns of history forwarded to the model. */
const MAX_HISTORY = 10
/** Max characters per message (defense against prompt-stuffing). */
const MAX_MESSAGE_CHARS = 4000

function l2normalize(vec: number[]): number[] {
  let sumSq = 0
  for (const v of vec) sumSq += v * v
  const norm = Math.sqrt(sumSq)
  if (norm === 0) return vec
  return vec.map((v) => v / norm)
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) dot += a[i]! * b[i]!
  return dot
}

/**
 * Mean of all chunk embeddings, re-normalized. Computed once from the committed
 * index. Returns `undefined` when the index is empty (→ guard fails open).
 */
let cachedCentroid: number[] | null | undefined
function corpusCentroid(): number[] | undefined {
  if (cachedCentroid !== undefined) return cachedCentroid ?? undefined

  const records = (snapshot as unknown as IndexSnapshot).records ?? []
  if (records.length === 0) {
    cachedCentroid = null
    return undefined
  }

  const dim = records[0]!.embedding.length
  const sum = new Array<number>(dim).fill(0)
  for (const r of records) {
    const e = r.embedding
    for (let i = 0; i < dim; i++) sum[i]! += e[i] ?? 0
  }
  for (let i = 0; i < dim; i++) sum[i]! /= records.length
  cachedCentroid = l2normalize(sum)
  return cachedCentroid
}

export interface ScopeOptions {
  /** Override the embedder (tests). Defaults to the local ONNX embed. */
  embed?: EmbedFn
  /** Override the cosine cutoff (tests). */
  threshold?: number
}

export interface ScopeResult {
  inScope: boolean
  /** Human-readable reason when out of scope (for logging / the decline copy). */
  reason?: string
}

/**
 * Decide whether a query is within the AgentsKit docs domain. Fails open when
 * the corpus centroid is unavailable or embedding errors — never blocks a real
 * question on guard failure.
 */
export async function checkScope(query: string, options: ScopeOptions = {}): Promise<ScopeResult> {
  const text = query.trim()
  if (text.length === 0) return { inScope: false, reason: 'empty query' }

  const centroid = corpusCentroid()
  if (!centroid) return { inScope: true }

  const threshold = options.threshold ?? ON_TOPIC_THRESHOLD
  const embed = options.embed ?? defaultEmbed

  try {
    const vec = await embed(text)
    const score = cosine(vec, centroid)
    if (score < threshold) {
      return {
        inScope: false,
        reason: `off-topic (similarity ${score.toFixed(3)} < ${threshold})`,
      }
    }
    return { inScope: true }
  } catch {
    // Embedding failed — don't block the user on an optimization.
    return { inScope: true }
  }
}

/** A sanitized chat turn (only user/assistant survive). */
export interface SanitizedMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Strip any client-supplied `system` (or `tool`) role — the route injects its
 * own grounded system prompt — cap history to the most recent turns, and bound
 * per-message size. Accepts loosely-typed client input and returns a clean list.
 */
export function sanitizeMessages(
  msgs: ReadonlyArray<Partial<Message> | { role?: string; content?: unknown }>,
): SanitizedMessage[] {
  const list = Array.isArray(msgs) ? msgs : []
  return list
    .filter((m): m is { role: string; content?: unknown } => {
      const role = (m as { role?: string }).role
      return role === 'user' || role === 'assistant'
    })
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content ?? '').slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_HISTORY)
}
