// Thin OpenRouter client with a free-tier model fallback chain.
// Never swap for a paid model without explicit confirmation — docs infrastructure must stay at $0.

// Current tool-capable :free model ids (verified against the OpenRouter /models
// catalog 2026-06-17). Free ids rotate — refresh if you see 404s. The free pool
// is shared + rate-limited (429); spreading across many DIVERSE providers (so
// rate limits don't all hit at once) + the fallback cascade + a quick per-model
// retry is the mitigation. Regenerate with: scripts/check-free-models (or the
// /models catalog filtered by supported_parameters including "tools").
export const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'cohere/north-mini-code:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
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
  const models = opts.models ?? FREE_MODELS
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
