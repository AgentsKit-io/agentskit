import type { EmbedFn } from '@agentskit/core'
import { embeddingError, readEmbeddingJson, requireEmbeddingVector, throwIfNotOk } from './shared'

const MAX_MODEL_LIST_BYTES = 2 * 1024 * 1024
const MAX_EMBEDDING_RESPONSE_BYTES = 16 * 1024 * 1024

/**
 * Configuration options for the Gemini embedder.
 */
export interface GeminiEmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl}/v1beta/models`
  const response = await fetch(url, {
    headers: { 'x-goog-api-key': apiKey },
  })
  await throwIfNotOk(response, 'gemini', url)
  const data = await readEmbeddingJson<{
    models: Array<{ name: string; supportedGenerationMethods: string[] }>
  }>(
    response,
    'Gemini',
    MAX_MODEL_LIST_BYTES,
  )
  return data.models
    .filter(m => m.supportedGenerationMethods.includes('embedContent'))
    .map(m => m.name.replace('models/', ''))
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
    return embeddingError('Gemini', `${originalError}. Available embedding models: ${list}`)
  } catch (fetchError) {
    return embeddingError('Gemini', `${originalError}. Could not fetch available models`, fetchError)
  }
}

/**
 * Creates an embedder for Gemini embeddings.
 * @param config Adapter configuration.
 * @returns The EmbedFn result.
 */
export function geminiEmbedder(config: GeminiEmbedderConfig): EmbedFn {
  const {
    apiKey,
    model = 'text-embedding-004',
    baseUrl = 'https://generativelanguage.googleapis.com',
  } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(
      `${baseUrl}/v1beta/models/${model}:embedContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      },
    )

    if (!response.ok) {
      void response.body?.cancel().catch(() => {})
      const message = `HTTP ${response.status}`
      throw await buildModelError(baseUrl, apiKey, message)
    }

    const data = await readEmbeddingJson<{ embedding?: { values?: unknown } }>(
      response,
      'Gemini',
      MAX_EMBEDDING_RESPONSE_BYTES,
    )
    return requireEmbeddingVector(data.embedding?.values, 'Gemini')
  }
}
