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
import { embed as defaultEmbed } from '../../../docs-next/lib/rag/embed'

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
 * Load the committed index on first call; cached thereafter. The dynamic
 * `import()` makes the JSON a lazily-loaded chunk — kept out of the module-load
 * graph (RFC-0006 D6 cold-start win) while still bundled + shipped by the builder
 * (no serverless file-resolution risk, unlike an `fs` read).
 */
async function loadIndexRecords(): Promise<IndexRecord[]> {
  const mod = (await import('../../../docs-next/lib/ask-index/index.json')) as { default: IndexSnapshot }
  return mod.default.records ?? []
}

/**
 * Mean of all chunk embeddings, re-normalized. Computed once from the committed
 * index (loaded lazily on first call). Returns `undefined` when the index is
 * empty (→ guard fails open).
 */
let cachedCentroid: number[] | null | undefined
async function corpusCentroid(): Promise<number[] | undefined> {
  if (cachedCentroid !== undefined) return cachedCentroid ?? undefined

  const records = await loadIndexRecords()
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

  const centroid = await corpusCentroid()
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

/**
 * Cheap, pre-LLM triage. Returns a canned reply for trivia (greetings, "test",
 * empty/noise) and a firm decline for obvious prompt-injection attempts — so we
 * never spend a model call (or risk a jailbreak) on those. Real questions —
 * including single-word ones like "memory" — fall through to `{ kind: 'ok' }`.
 * This is defense-in-depth on top of sanitizeMessages + the grounded prompt
 * (which already fences retrieved text as untrusted data); it is not the only
 * safeguard.
 */
export type Triage = { kind: 'ok' } | { kind: 'canned'; reply: string }

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+|the\s+|your\s+)?(previous|prior|above|earlier|those|these)\s+(instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(all\s+|the\s+|your\s+)?(previous|prior|above|instructions?|rules?)/i,
  /forget\s+(everything|all|your\s+(instructions?|rules?|prompt))/i,
  /\b(system|developer)\s+(prompt|message|instructions?)\b/i,
  /(reveal|show|print|repeat|leak|expose|tell\s+me)\b.{0,40}\b(your|the|initial|original)\b.{0,20}(prompt|instructions?|rules?|system)/i,
  /\byou\s+are\s+now\b|\bact\s+as\s+(an?\s+)?|\bpretend\s+(to\s+be|you)|\bnew\s+(persona|role|character)\b/i,
  /\bjailbreak\b|\bdo\s+anything\s+now\b|\bdeveloper\s+mode\b|\bunfiltered\b/i,
  /\boverride\s+(your|the|all)\s+(instructions?|rules?|prompt|settings?)/i,
  /\bfrom\s+now\s+on\b.{0,30}(ignore|forget|act|you\s+are)/i,
]

const GREETINGS: ReadonlySet<string> = new Set([
  'oi', 'olá', 'ola', 'eai', 'e ai', 'opa', 'salve', 'hi', 'hello', 'hey', 'heya',
  'yo', 'hola', 'sup', 'wsp', 'bom dia', 'boa tarde', 'boa noite', 'good morning',
  'good afternoon', 'good evening',
])

const NOISE: ReadonlySet<string> = new Set([
  'test', 'teste', 'testing', 'testando', 'ping', 'pong', 'check', 'hello world',
  'asdf', 'qwerty', 'aaa', 'lorem ipsum', 'foo', 'bar',
])

const DEFAULT_REPLIES = {
  greeting:
    '👋 Hi! I answer questions about **AgentsKit** straight from the docs. Try *“How do I create a runtime agent?”* or *“What memory backends are there?”*',
  noise: 'I’m working ✓ — ask a real question about **AgentsKit** and I’ll answer from the docs.',
  injection:
    "I only answer questions about the **AgentsKit** documentation — I can’t change my instructions or role, or reveal my prompt. Ask me about agents, tools, skills, memory, RAG, or deploying.",
} as const

/**
 * Extra triage rules a consumer can supply. All are MERGED with the built-ins —
 * additive, so you keep the injection defenses and add your own greetings, noise
 * words, injection patterns, or override the canned copy.
 */
export interface TriageRules {
  greetings?: readonly string[]
  noise?: readonly string[]
  injectionPatterns?: readonly RegExp[]
  replies?: Partial<typeof DEFAULT_REPLIES>
}

export function triageMessage(query: string, extra: TriageRules = {}): Triage {
  const replies = { ...DEFAULT_REPLIES, ...extra.replies }
  const raw = query.trim()
  if (raw.length === 0) return { kind: 'canned', reply: 'Ask me anything about **AgentsKit** and I’ll answer from the docs.' }

  const injection = [...INJECTION_PATTERNS, ...(extra.injectionPatterns ?? [])]
  if (injection.some((re) => re.test(raw))) return { kind: 'canned', reply: replies.injection }

  const norm = raw.toLowerCase().replace(/[!?.…,~]+$/g, '').trim()
  const greetings = new Set([...GREETINGS, ...(extra.greetings ?? [])])
  if (greetings.has(norm)) return { kind: 'canned', reply: replies.greeting }

  // Pure noise / non-words / "test". Single real words (e.g. "memory") pass.
  const noise = new Set([...NOISE, ...(extra.noise ?? [])])
  if (noise.has(norm) || /^[^a-zÀ-ſ]+$/i.test(norm) || norm.length < 2) {
    return { kind: 'canned', reply: replies.noise }
  }

  return { kind: 'ok' }
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
