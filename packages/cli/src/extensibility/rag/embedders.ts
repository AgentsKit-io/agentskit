import type { EmbedFn } from '@agentskit/core'

export interface OpenAiEmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

/**
 * Minimal OpenAI-compatible embedder. Works with the official OpenAI API
 * or any gateway that speaks the `/v1/embeddings` shape (OpenRouter,
 * Azure OpenAI, local servers, etc.). One embedding per call — batching
 * is a follow-up when demand arrives.
 */
export function createOpenAiEmbedder(config: OpenAiEmbedderConfig): EmbedFn {
  const model = config.model ?? 'text-embedding-3-small'
  const baseUrl = (config.baseUrl ?? 'https://api.openai.com').replace(/\/$/, '')

  return async (text: string): Promise<number[]> => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`embedder ${model} HTTP ${res.status}: ${body}`)
    }
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> }
    const first = json.data?.[0]?.embedding
    if (!first) throw new Error(`embedder ${model}: response missing data[0].embedding`)
    return first
  }
}
