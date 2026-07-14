/**
 * Central AgentsKit Ask backend (RFC-0007) — a persistent Hono server.
 *
 * The whole point vs. Vercel serverless: this is a long-lived process, so the ONNX
 * embedder + each corpus index load ONCE at boot and stay warm — no cold start, no
 * native-binary tracing hacks. One embedder + one LLM pool + the shared guards serve
 * N per-property corpora, routed by a `corpus` query param.
 *
 * The backend-owned ask handler serves docs plus ecosystem corpora. Docs uses the
 * committed vector index; sibling properties can use configurable remote llms.txt
 * sources until they publish dedicated indexes.
 *
 * REDIS_URL (durable cache + rate-limit), ASK_REDIS_URL (rate-limit only), or
 * UPSTASH_REDIS_REST_URL/_TOKEN fallback; in-memory fallback otherwise.
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
import { AskCache } from './ask/cache'
import { createAskHandler } from './ask/handler'
import { rateLimit } from './ask/rate-limit'
import { ASK_PERSONAS, personaPrompt } from './ask/personas'
import { UI_TOOLS } from './ask/protocol'
import { createRemoteCorpusRetriever } from './ask/remote-corpus'
import { embed } from '../../docs-next/lib/rag/embed'
import { createDocsRetriever, formatCitedContext } from '../../docs-next/lib/rag/retrieve'
import { FREE_MODELS } from '../../docs-next/lib/openrouter'
import { docsAssistant } from '../../docs-next/lib/ask/skill'

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
  persona: string
  title: string
}

/**
 * The corpus registry. The embedder + adapter + guards are shared; only the
 * retriever + prompt differ per corpus.
 */
const corpora: Record<string, Corpus> = {
  docs: {
    retriever: createDocsRetriever(),
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    formatContext: (docs) => formatCitedContext(docs).context,
    persona: 'docs-helper',
    title: 'AgentsKit docs',
  },
  registry: {
    retriever: createRemoteCorpusRetriever({
      id: 'registry',
      title: 'AgentsKit Registry',
      sources: [
        {
          title: 'Registry full docs',
          url: process.env.ASK_REGISTRY_LLMS_FULL_URL ?? 'https://registry.agentskit.io/llms-full.txt',
        },
        {
          title: 'Registry llms',
          url: process.env.ASK_REGISTRY_LLMS_URL ?? 'https://registry.agentskit.io/llms.txt',
        },
        {
          title: 'Registry index',
          url: process.env.ASK_REGISTRY_INDEX_URL ?? 'https://registry.agentskit.io/r/index.json',
        },
      ],
    }),
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    formatContext: (docs) => formatCitedContext(docs).context,
    persona: 'registry-guide',
    title: 'AgentsKit Registry',
  },
  playbook: {
    retriever: createRemoteCorpusRetriever({
      id: 'playbook',
      title: 'Agents Playbook',
      sources: [
        {
          title: 'Playbook full docs',
          url: process.env.ASK_PLAYBOOK_LLMS_FULL_URL ?? 'https://playbook.agentskit.io/llms-full.txt',
        },
        {
          title: 'Playbook llms',
          url: process.env.ASK_PLAYBOOK_LLMS_URL ?? 'https://playbook.agentskit.io/llms.txt',
        },
      ],
    }),
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    formatContext: (docs) => formatCitedContext(docs).context,
    persona: 'playbook-coach',
    title: 'Agents Playbook',
  },
  'doc-bridge': {
    retriever: createRemoteCorpusRetriever({
      id: 'doc-bridge',
      title: 'AgentsKit Doc Bridge',
      sources: [
        {
          title: 'Doc Bridge full docs',
          url:
            process.env.ASK_DOC_BRIDGE_LLMS_FULL_URL ??
            'https://agentskit-io.github.io/doc-bridge/llms-full.txt',
        },
        {
          title: 'Doc Bridge llms',
          url:
            process.env.ASK_DOC_BRIDGE_LLMS_URL ??
            'https://agentskit-io.github.io/doc-bridge/llms.txt',
        },
      ],
    }),
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    formatContext: (docs) => formatCitedContext(docs).context,
    persona: 'docs-helper',
    title: 'AgentsKit Doc Bridge',
  },
  akos: {
    retriever: createRemoteCorpusRetriever({
      id: 'akos',
      title: 'AKOS',
      sources: [
        {
          title: 'AKOS full docs',
          url:
            process.env.ASK_AKOS_LLMS_FULL_URL ??
            process.env.AKOS_LLMS_FULL_URL ??
            'https://akos.agentskit.io/llms-full.txt',
        },
        {
          title: 'AKOS llms',
          url:
            process.env.ASK_AKOS_LLMS_URL ??
            process.env.AKOS_LLMS_URL ??
            'https://akos.agentskit.io/llms.txt',
        },
      ],
    }),
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    formatContext: (docs) => formatCitedContext(docs).context,
    persona: 'akos-sales',
    title: 'AKOS',
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

const cacheEnabled = process.env.ASK_CACHE_ENABLED !== '0'
const askCache = cacheEnabled
  ? new AskCache({
      namespace: process.env.ASK_CACHE_NAMESPACE ?? 'ask:v1',
      answerTtlMs: Number(process.env.ASK_ANSWER_CACHE_TTL_MS ?? 30 * 24 * 60 * 60 * 1000),
      retrievalTtlMs: Number(process.env.ASK_RETRIEVAL_CACHE_TTL_MS ?? 7 * 24 * 60 * 60 * 1000),
      semanticThreshold: Number(process.env.ASK_SEMANTIC_CACHE_THRESHOLD ?? 0.86),
      embed,
    })
  : null

/** Build a warm `createAskHandler` per corpus (shared adapter/guards/limiter). */
const handlers: Record<string, (req: Request) => Promise<Response>> = {}
for (const [id, c] of Object.entries(corpora)) {
  handlers[id] = createAskHandler({
    retriever: c.retriever,
    adapter,
    systemPrompt: personaPrompt(c.persona, c.systemPrompt),
    temperature: c.temperature,
    uiTools: UI_TOOLS,
    richUi: process.env.ASK_RICH_UI === '1',
    modelLabel: FREE_MODELS[0],
    formatContext: c.formatContext,
    rateLimiter: async (req) => rateLimit(clientIp(req)),
    security: { maxBodyBytes: MAX_BODY_BYTES },
    cache: askCache
      ? {
          corpus: id,
          persona: c.persona,
          promptVersion: process.env.ASK_PROMPT_VERSION ?? 'v1',
          getAnswer: (key) => askCache.getAnswer(key),
          setAnswer: (key, value) => askCache.setAnswer(key, value),
          getRetrieval: (key) => askCache.getRetrieval(key),
          setRetrieval: (key, docs) => askCache.setRetrieval(key, docs),
        }
      : undefined,
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
  'https://www.agentskit.io,https://agentskit.io,https://registry.agentskit.io,https://playbook.agentskit.io,https://akos.agentskit.io,https://agentskit-io.github.io,http://localhost:3000'
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
app.get('/v1/corpora', (c) =>
  c.json({
    corpora: Object.entries(corpora).map(([id, corpus]) => ({
      id,
      title: corpus.title,
      persona: corpus.persona,
      brand: ASK_PERSONAS[corpus.persona]?.brand,
      cta: ASK_PERSONAS[corpus.persona]?.cta,
    })),
  }),
)

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
    const cacheKey = {
      corpus,
      persona: 'search',
      promptVersion: process.env.ASK_PROMPT_VERSION ?? 'v1',
      query: query.trim(),
    }
    const cachedDocs = askCache ? await askCache.getRetrieval(cacheKey) : undefined
    const docs = cachedDocs ?? (await cor.retriever.retrieve({ query: query.trim(), messages: [] }))
    if (!cachedDocs && askCache) await askCache.setRetrieval(cacheKey, docs)
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
