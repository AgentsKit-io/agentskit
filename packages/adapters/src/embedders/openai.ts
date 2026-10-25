import type { EmbedFn } from '@agentskit/core'
import { embeddingError, readEmbeddingJson, requireEmbeddingVector, throwIfNotOk } from './shared'

const MAX_MODEL_LIST_BYTES = 2 * 1024 * 1024
const MAX_EMBEDDING_RESPONSE_BYTES = 16 * 1024 * 1024

/**
 * Configuration options for the OpenAI embedder.
 */
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
  const data = await readEmbeddingJson<{ data: Array<{ id: string }> }>(
    response,
    'OpenAI',
    MAX_MODEL_LIST_BYTES,
  )
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

/**
 * Creates an embedder for the OpenAI embeddings API.
 * @param config Adapter configuration.
 * @returns The EmbedFn result.
 */
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

    const data = await readEmbeddingJson<{ data?: Array<{ embedding?: unknown }> }>(
      response,
      'OpenAI',
      MAX_EMBEDDING_RESPONSE_BYTES,
    )
    const embedding = data.data?.[0]?.embedding
    return requireEmbeddingVector(embedding, 'OpenAI')
  }
}
