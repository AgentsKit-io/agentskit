// Thin OpenRouter client with a model fallback chain.
// The OpenRouter account enforces Zero Data Retention, so only models with ZDR
// endpoints route at all (GET https://openrouter.ai/api/v1/endpoints/zdr).
// Free first; the cheap paid fallback (owner-approved 2026-10-02) runs on a
// capped key. Don't add other paid models without explicit confirmation.

// Verified tool-capable with ZDR endpoints on 2026-10-02.
export const ASK_MODELS = [
  'qwen/qwen3.8-27b:free',
  'z-ai/glm-5.3-flash',
]

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type StreamOptions = {
  apiKey: string
  messages: ChatMessage[]
  models?: string[]
  signal?: AbortSignal
  referer?: string
  title?: string
}

/**
 * Stream chat completions from OpenRouter. Tries each model in order; on 4xx/5xx
 * or network failure before any chunks arrive, advances to the next model.
 * Returns a ReadableStream of plain text chunks (already decoded).
 */
export async function streamWithFallback(opts: StreamOptions): Promise<{ stream: ReadableStream<Uint8Array>; model: string }> {
  const models = opts.models ?? ASK_MODELS
  let lastErr: unknown = null
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: opts.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${opts.apiKey}`,
          ...(opts.referer ? { 'HTTP-Referer': opts.referer } : {}),
          ...(opts.title ? { 'X-Title': opts.title } : {}),
        },
        body: JSON.stringify({ model, stream: true, messages: opts.messages }),
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        lastErr = new Error(`${model}: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`)
        continue
      }
      const stream = decodeSSEToText(res.body)
      return { stream, model }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('all models failed')
}

function decodeSSEToText(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = upstream.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buf = ''
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          controller.close()
          return
        }
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content ?? ''
            if (delta) controller.enqueue(encoder.encode(delta))
          } catch {
            /* skip partial frames */
          }
        }
        return
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })
}
