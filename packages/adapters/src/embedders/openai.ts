import type { EmbedFn } from '@agentskit/core'
import { embeddingError, requireEmbeddingVector, throwIfNotOk } from './shared'

export interface OpenAIEmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl}/v1/models`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  await throwIfNotOk(response, 'openai', url)
  const data = (await response.json()) as { data: Array<{ id: string }> }
  return data.data
    .map(m => m.id)
    .filter(id => id.includes('embed'))
    .sort()
}

async function buildModelError(
  baseUrl: string,
  apiKey: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(baseUrl, apiKey)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return embeddingError('OpenAI', `${originalError}. Available embedding models: ${list}`)
  } catch (fetchError) {
    return embeddingError('OpenAI', `${originalError}. Could not fetch available models`, fetchError)
  }
}

export function openaiEmbedder(config: OpenAIEmbedderConfig): EmbedFn {
  const { apiKey, model = 'text-embedding-3-small', baseUrl = 'https://api.openai.com' } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    })

    if (!response.ok) {
      void response.body?.cancel().catch(() => {})
      const message = `HTTP ${response.status}`
      throw await buildModelError(baseUrl, apiKey, message)
    }

    const data = (await response.json()) as { data?: Array<{ embedding?: unknown }> }
    const embedding = data.data?.[0]?.embedding
    return requireEmbeddingVector(embedding, 'OpenAI')
  }
}
