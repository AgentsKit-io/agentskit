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
import type { RetrievedDocument, Retriever } from '@agentskit/core'
import { createFallbackAdapter, openrouter } from '@agentskit/adapters'
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

function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

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
  })
}

// Warm the model + every corpus index at boot — the persistent-process payoff.
for (const c of Object.values(corpora)) {
  void Promise.resolve(c.retriever.retrieve({ query: 'warmup', messages: [] })).catch(() => {})
}

const app = new Hono()

const origins = (
  process.env.ASK_CORS_ORIGINS ??
  'https://www.agentskit.io,https://agentskit.io,https://registry.agentskit.io,http://localhost:3000'
).split(',')
app.use('/v1/*', cors({ origin: origins, allowMethods: ['POST', 'GET', 'OPTIONS'] }))

app.get('/health', (c) => c.text('ok'))
app.get('/v1/corpora', (c) => c.json({ corpora: Object.keys(corpora) }))

app.post('/v1/ask', (c) => {
  const corpus = c.req.query('corpus') ?? 'docs'
  const handler = handlers[corpus]
  if (!handler) return c.json({ error: `unknown corpus "${corpus}"` }, 400)
  return handler(c.req.raw)
})

const port = Number(process.env.PORT ?? 8080)
serve({ fetch: app.fetch, port }, () => {
  console.log(`[ask-backend] listening on :${port} — corpora: ${Object.keys(corpora).join(', ')}`)
})
