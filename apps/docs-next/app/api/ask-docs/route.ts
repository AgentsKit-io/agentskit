/**
 * Ask-the-docs streaming route — the Next.js (App Router) mount over the
 * framework-neutral `createAskHandler` core (RFC-0006 D5).
 *
 * Runs in the Node runtime (was edge) because retrieval + the scope guard run a
 * local ONNX embedding model in-process. This file only wires the docs-specific
 * dependencies into `AskConfig`; the whole request pipeline lives in
 * `lib/ask/handler.ts` so it is portable to other frameworks and unit-testable.
 */
import { createFallbackAdapter, openrouter } from '@agentskit/adapters'
import { createDocsRetriever, formatCitedContext } from '@/lib/rag/retrieve'
import { FREE_MODELS } from '@/lib/openrouter'
import { docsAssistant } from '@/lib/ask/skill'
import { UI_TOOLS } from '@/lib/ask/protocol'
import { rateLimit } from '@/lib/ask/rate-limit'
import { createAskHandler } from '@/lib/ask/handler'

export const runtime = 'nodejs'

/** Build the handler once per server instance (adapter + retriever are reused). */
function buildHandler(apiKey: string): (req: Request) => Promise<Response> {
  // Per-model: one quick retry on transient 429/5xx, then the fallback cascades to
  // the next free model — favouring breadth across the diverse $0 pool over waits.
  const adapter = createFallbackAdapter(
    FREE_MODELS.map((model) => ({
      id: model,
      adapter: openrouter({ apiKey, model, retry: { maxAttempts: 2, baseDelayMs: 400 } }),
    })),
  )

  return createAskHandler({
    retriever: createDocsRetriever(),
    adapter,
    systemPrompt: docsAssistant.systemPrompt,
    temperature: docsAssistant.temperature,
    // Free models botch tool-calling; default to NO tools → reliable grounded
    // markdown text + server-side deterministic citations. ASK_RICH_UI=1 + a
    // capable BYO-key model enables the full generative-UI tool set.
    richUi: process.env.ASK_RICH_UI === '1',
    uiTools: UI_TOOLS,
    modelLabel: FREE_MODELS[0] ?? 'openrouter',
    // Keep the docs-specific cited-context formatter (path#anchor markers, token cap).
    formatContext: (docs) => formatCitedContext(docs).context,
    // Default per-IP limiter (Upstash when configured, in-memory fallback).
    rateLimiter: async (req) => {
      const ip =
        req.headers.get('x-real-ip') ??
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown'
      return rateLimit(ip)
    },
  })
}

let handler: ((req: Request) => Promise<Response>) | null = null

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ask-docs is not configured' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }
  handler ??= buildHandler(apiKey)
  return handler(req)
}
