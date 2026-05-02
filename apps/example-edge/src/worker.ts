/**
 * apps/example-edge — AgentsKit on Cloudflare Workers.
 *
 * Demonstrates the sub-50KB hot path documented at
 * `/docs/production/edge`. The Worker exposes one endpoint:
 *
 *   POST /chat
 *     body: { messages: [{ role: 'user', content: '...' }] }
 *     returns: text/event-stream of provider chunks
 *
 * Hot path — what runs per request:
 *   1. `openai({ apiKey, model })` factory (≈ 1.5 KB after tree-shake)
 *   2. `adapter.createSource({ messages }).stream()` — async iterator
 *   3. Bridge each chunk into a SSE-shaped ReadableStream
 *
 * No runtime, no memory, no tools — those are opt-in. The whole thing
 * fits inside the bundle budget for free-tier Workers (≤ 1 MB raw,
 * ≤ 50 KB warm path our docs target).
 */

import { openai } from '@agentskit/adapters'
import type { Message } from '@agentskit/core'

interface Env {
  OPENAI_API_KEY: string
  OPENAI_MODEL?: string
}

interface ChatRequestBody {
  messages: Array<Pick<Message, 'role' | 'content'>>
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
} as const

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      return new Response('ok', { status: 200, headers: CORS_HEADERS })
    }
    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return new Response('not found', { status: 404, headers: CORS_HEADERS })
    }
    if (!env.OPENAI_API_KEY) {
      return new Response('OPENAI_API_KEY not configured', {
        status: 500,
        headers: CORS_HEADERS,
      })
    }

    let body: ChatRequestBody
    try {
      body = (await request.json()) as ChatRequestBody
    } catch {
      return new Response('invalid json body', { status: 400, headers: CORS_HEADERS })
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response('messages[] required', { status: 400, headers: CORS_HEADERS })
    }

    const adapter = openai({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    })

    const source = adapter.createSource({
      messages: body.messages.map((m, i) => ({
        id: String(i),
        role: m.role,
        content: m.content,
        status: 'complete' as const,
        createdAt: new Date(),
      })),
    })

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of source.stream()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            if (chunk.type === 'done') break
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`))
        } finally {
          controller.close()
        }
      },
      cancel() {
        source.abort()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    })
  },
}
