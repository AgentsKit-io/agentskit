import type { EmbedFn } from '@agentskit/core'

export interface OpenAICompatibleEmbedderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = (await response.json()) as { data: Array<{ id: string }> }
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
    const models = await fetchAvailableModels(baseUrl, apiKey)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return new Error(
      `${provider} embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `${provider} embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function createOpenAICompatibleEmbedder(provider: string, defaultBaseUrl: string) {
  return function embedder(config: OpenAICompatibleEmbedderConfig): EmbedFn {
    if (!config.model) {
      throw new Error(`Model is required for ${provider}. Pass { model: "<model-name>" }.`)
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
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string }
        }
        const message = errorBody.error?.message ?? `HTTP ${response.status}`
        throw await buildModelError(provider, baseUrl, apiKey, message)
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> }
      return data.data[0].embedding
    }
  }
}
