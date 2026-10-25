import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { EmbedFn } from '@agentskit/core'
import { embeddingError, readEmbeddingJson, requireEmbeddingVector, throwIfNotOk } from './shared'

const MAX_MODEL_LIST_BYTES = 2 * 1024 * 1024
const MAX_EMBEDDING_RESPONSE_BYTES = 16 * 1024 * 1024

/**
 * Configuration options for the OpenAI-compatible embedder.
 */
export interface OpenAICompatibleEmbedderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

async function fetchAvailableModels(provider: string, baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl}/v1/models`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  await throwIfNotOk(response, provider, url)
  const data = await readEmbeddingJson<{ data: Array<{ id: string }> }>(
    response,
    provider,
    MAX_MODEL_LIST_BYTES,
  )
  return data.data
    .map(m => m.id)
    .filter(id => id.includes('embed'))
    .sort()
}

async function buildModelError(
  provider: string,
  baseUrl: string,
  apiKey: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(provider, baseUrl, apiKey)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return embeddingError(provider, `${originalError}. Available embedding models: ${list}`)
  } catch (fetchError) {
    return embeddingError(provider, `${originalError}. Could not fetch available models`, fetchError)
  }
}

/**
 * Creates an embedder for an OpenAI-compatible embeddings API.
 * @param provider Value passed to the function.
 * @param defaultBaseUrl Value passed to the function.
 * @returns The the function result result.
 */
export function createOpenAICompatibleEmbedder(provider: string, defaultBaseUrl: string) {
  return function embedder(config: OpenAICompatibleEmbedderConfig): EmbedFn {
    if (!config.model) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `Model is required for ${provider}. Pass { model: "<model-name>" }.`,
        hint: `${provider} does not infer a default; pick a recent embedding model and pass it explicitly.`,
      })
    }
    const { apiKey, model, baseUrl = defaultBaseUrl } = config

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
        throw await buildModelError(provider, baseUrl, apiKey, message)
      }

      const data = await readEmbeddingJson<{ data?: Array<{ embedding?: unknown }> }>(
        response,
        provider,
        MAX_EMBEDDING_RESPONSE_BYTES,
      )
      const embedding = data.data?.[0]?.embedding
      return requireEmbeddingVector(embedding, provider)
    }
  }
}
