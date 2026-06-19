/**
 * Central AgentsKit Ask backend (RFC-0007) — a persistent Hono server.
 *
 * The whole point vs. Vercel serverless: this is a long-lived process, so the ONNX
 * embedder + each corpus index load ONCE at boot and stay warm — no cold start, no
 * native-binary tracing hacks. One embedder + one LLM pool + the shared guards serve
 * N per-property corpora, routed by a `corpus` query param.
 *
 * F0 reuses the docs app's ask source directly (no shared lib, per the author) and
 * serves the `docs` corpus. F1 adds `registry`; F2 wires the cross-repo corpora.
 *
 * Env: OPENROUTER_API_KEY (required), ASK_CORS_ORIGINS, ASK_RICH_UI, PORT,
 * UPSTASH_REDIS_REST_URL/_TOKEN (durable rate-limit; in-memory fallback otherwise).
 */
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import type { JSONSchema7 } from 'json-schema'
import type { RetrievedDocument, Retriever } from '@agentskit/core'
import { createFallbackAdapter, openrouter } from '@agentskit/adapters'
import { createAjvValidator } from '@agentskit/validation'
import { createMcpHandler } from './mcp'
// Reuse the docs app's ask source (relative — no shared package, RFC-0007 D5).
import { createAskHandler } from '../../docs-next/lib/ask/handler'
import { createDocsRetriever, formatCitedContext } from '../../docs-next/lib/rag/retrieve'
import { FREE_MODELS } from '../../docs-next/lib/openrouter'
import { docsAssistant } from '../../docs-next/lib/ask/skill'
import { UI_TOOLS } from '../../docs-next/lib/ask/protocol'
import { rateLimit } from '../../docs-next/lib/ask/rate-limit'

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
  console.error('[ask-backend] OPENROUTER_API_KEY is required')
  process.exit(1)
}

/** Shared $0 free-model fallback chain — one adapter for every corpus. */
const adapter = createFallbackAdapter(
  FREE_MODELS.map((model) => ({
    id: model,
    adapter: openrouter({ apiKey, model, retry: { maxAttempts: 2, baseDelayMs: 400 } }),
  })),
)

/** A registered knowledge base: its retriever + grounding config. */
interface Corpus {
  retriever: Retriever
  systemPrompt: string
  temperature?: number
  formatContext: (docs: RetrievedDocument[]) => string
}

/**
 * The corpus registry. F0 = `docs`. F1 adds `registry` (in-repo). F2 adds the
 * cross-repo corpora (akos/playbook) once their indexes are reachable. The embedder
 * + adapter + guards are shared; only the retriever + prompt differ per corpus.
 */
const corpora: Record<string, Corpus> = {
  docs: {
    retriever: createDocsRetriever(),
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    formatContext: (docs) => formatCitedContext(docs).context,
  },
}

/**
 * Spoof-resistant client IP for rate-limiting.
 *
 * `x-forwarded-for` is "client, proxy1, proxy2…": the LEFTMOST entry is set by the
 * caller and trivially forged (rotate it → bypass per-IP limits). Behind Railway's
 * single trusted proxy the spoof-resistant value is the RIGHTMOST entry — the IP
 * that proxy actually observed — so we take that. `x-real-ip` (proxy-set) wins when
 * present. (If a future deploy adds proxy hops, trust the Nth-from-right instead.)
 */
function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]!
  }
  return 'unknown'
}

/** Hand the ask handler a request whose `x-real-ip` is our trusted IP, so its own
 *  per-IP rate-limit keys off the spoof-resistant value (not leftmost XFF). */
function withTrustedIp(req: Request): Request {
  const headers = new Headers(req.headers)
  headers.set('x-real-ip', clientIp(req))
  return new Request(req, { headers })
}

/** Reject oversized bodies before any parse/compute (defense in depth with the
 *  handler's own `maxBodyBytes` read-cap). Chat payloads are a few KB at most. */
const MAX_BODY_BYTES = 32 * 1024

/** Per-IP limiter for the raw `/v1/search` + MCP `search_docs` path (own bucket,
 *  separate from the costlier `ask` path). */
const searchLimiter = (ip: string) => rateLimit(`search:${ip}`)

/** Build a warm `createAskHandler` per corpus (shared adapter/guards/limiter). */
const handlers: Record<string, (req: Request) => Promise<Response>> = {}
for (const [id, c] of Object.entries(corpora)) {
  handlers[id] = createAskHandler({
    retriever: c.retriever,
    adapter,
    systemPrompt: c.systemPrompt,
    temperature: c.temperature,
    uiTools: UI_TOOLS,
    richUi: process.env.ASK_RICH_UI === '1',
    modelLabel: FREE_MODELS[0],
    formatContext: c.formatContext,
    rateLimiter: async (req) => rateLimit(clientIp(req)),
    security: { maxBodyBytes: MAX_BODY_BYTES },
  })
}

// Warm the model + every corpus index — the persistent-process payoff. Deferred
// (not run at module load) so the embedder's CPU-heavy first load can't block the
// initial `/health` healthcheck and get the container killed before it goes ready.
function warmCorpora(): void {
  for (const c of Object.values(corpora)) {
    void Promise.resolve(c.retriever.retrieve({ query: 'warmup', messages: [] })).catch(() => {})
  }
}

const app = new Hono()

// Parse the CORS allow-list defensively: trim each entry and strip a trailing slash
// (an `Origin` header never has one, so `https://x/` would silently never match), and
// drop empties. Log the effective list so a misconfigured ASK_CORS_ORIGINS is visible.
const origins = (
  process.env.ASK_CORS_ORIGINS ??
  'https://www.agentskit.io,https://agentskit.io,https://registry.agentskit.io,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)
console.log('[ask-backend] CORS allow-origins:', origins.join(', ') || '(none!)')
app.use('/v1/*', cors({ origin: origins, allowMethods: ['POST', 'GET', 'OPTIONS'] }))

// Reject oversized bodies up front on every compute route (cheap pre-parse guard).
const bodyCap = createMiddleware(async (c, next) => {
  const length = Number(c.req.header('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return c.json({ error: 'payload too large' }, 413)
  await next()
})
app.use('/v1/ask', bodyCap)
app.use('/v1/search', bodyCap)
app.use('/mcp', bodyCap)

app.get('/health', (c) => c.text('ok'))
app.get('/v1/corpora', (c) => c.json({ corpora: Object.keys(corpora) }))

app.post('/v1/ask', (c) => {
  const corpus = c.req.query('corpus') ?? 'docs'
  const handler = handlers[corpus]
  if (!handler) return c.json({ error: `unknown corpus "${corpus}"` }, 400)
  return handler(withTrustedIp(c.req.raw))
})

// Validate the search body against a JSON Schema via Ajv (the repo's runtime
// validator, @agentskit/validation — JSON Schema is canonical here, not Zod).
const validateSearch = createAjvValidator({ coerceTypes: true })
const SEARCH_SCHEMA: JSONSchema7 = {
  type: 'object',
  properties: {
    query: { type: 'string', minLength: 1, maxLength: 2000 },
    k: { type: 'integer', minimum: 1, maximum: 20 },
  },
  required: ['query'],
  additionalProperties: false,
}

// Raw retrieval — relevant chunks for a query, no LLM. Powers tools + the MCP
// search tool, and lets a site render sources without a full chat turn.
app.post('/v1/search', async (c) => {
  const corpus = c.req.query('corpus') ?? 'docs'
  const cor = corpora[corpus]
  if (!cor) return c.json({ error: `unknown corpus "${corpus}"` }, 400)
  const rl = await searchLimiter(clientIp(c.req.raw))
  if (!rl.ok) {
    return c.json({ error: 'rate limited', retryAfter: rl.retryAfterSec }, 429, {
      'retry-after': String(rl.retryAfterSec ?? 1),
    })
  }
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }
  const result = validateSearch(SEARCH_SCHEMA, (raw ?? {}) as Record<string, unknown>)
  if (!result.valid) {
    return c.json({ error: 'invalid request body', detail: result.errors }, 400)
  }
  const { query, k = 6 } = raw as { query: string; k?: number }
  try {
    const docs = await cor.retriever.retrieve({ query: query.trim(), messages: [] })
    return c.json({
      results: docs.slice(0, k).map((d) => ({
        content: d.content,
        score: d.score,
        path: (d.metadata as { path?: string } | undefined)?.path,
        title: (d.metadata as { title?: string } | undefined)?.title,
      })),
    })
  } catch (err) {
    console.error('[ask-backend] search failed:', err)
    return c.json({ error: 'search failed' }, 500)
  }
})

// MCP endpoint (RFC-0007 F3) — read-only JSON-RPC over POST, public (CORS `*`),
// over the same corpus registry. Reuses each corpus's retriever (search_docs) and
// warm ask handler (ask). Its own CORS handling, so it sits outside `/v1/*`.
const mcp = createMcpHandler(
  Object.fromEntries(
    Object.entries(corpora).map(([id, c]) => [id, { retriever: c.retriever, handler: handlers[id] }]),
  ),
  { searchLimiter },
)
app.all('/mcp', (c) => mcp(c.req.raw))

// Bind 0.0.0.0 explicitly — Railway's healthcheck reaches the container over its
// private network, so listening only on localhost/::1 would fail the check.
const port = Number(process.env.PORT ?? 8080)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(
    `[ask-backend] listening on ${info.address}:${info.port} — corpora: ${Object.keys(corpora).join(', ')}`,
  )
  // Let the healthcheck go green first, then warm the model in the background.
  setTimeout(warmCorpora, 3000).unref()
})
