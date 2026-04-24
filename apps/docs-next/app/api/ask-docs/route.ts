import { DOCS_CORPUS } from '@/lib/ask-context'
import { streamWithFallback, type ChatMessage } from '@/lib/openrouter'

export const runtime = 'edge'

const SYSTEM_PROMPT = `You are the AgentsKit.js docs assistant. Answer only from the context below. If the answer is not covered, say so and suggest the closest page. Keep replies short and link to /docs pages when relevant.

=== DOCS CORPUS ===
${DOCS_CORPUS}
=== END CORPUS ===`

// In-memory rate limit — per IP, per rolling minute. Good enough for a single-region edge deploy.
const WINDOW_MS = 60_000
const LIMIT = 8
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, retryAfterSec: 0 }
  }
  entry.count += 1
  if (entry.count > LIMIT) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfterSec: 0 }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ask-docs is not configured' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }

  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  const rl = rateLimit(ip)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'rate limited', retryAfter: rl.retryAfterSec }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(rl.retryAfterSec),
      },
    })
  }

  let body: { messages?: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const incoming = Array.isArray(body.messages) ? body.messages : []
  // Drop any system role the client sends — we inject our own corpus-bound prompt.
  const clean = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-10)
    .map((m) => ({ role: m.role, content: String(m.content ?? '').slice(0, 4000) }))

  if (clean.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...clean]

  try {
    const { stream, model } = await streamWithFallback({
      apiKey,
      messages,
      referer: 'https://www.agentskit.io',
      title: 'AgentsKit docs — Ask',
    })
    return new Response(stream, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-model': model,
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}
