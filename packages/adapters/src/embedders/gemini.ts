import type { EmbedFn } from '@agentskit/core'

export interface GeminiEmbedderConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl}/v1beta/models?key=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status} from gemini ${baseUrl}/v1beta/models: ${body.slice(0, 200)}`)
  }
  const data = (await response.json()) as {
    models: Array<{ name: string; supportedGenerationMethods: string[] }>
  }
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
    return new Error(
      `Gemini embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `Gemini embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function geminiEmbedder(config: GeminiEmbedderConfig): EmbedFn {
  const {
    apiKey,
    model = 'text-embedding-004',
    baseUrl = 'https://generativelanguage.googleapis.com',
  } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(
      `${baseUrl}/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      },
    )

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      const message = errorBody.error?.message ?? `HTTP ${response.status}`
      throw await buildModelError(baseUrl, apiKey, message)
    }

    const data = (await response.json()) as { embedding: { values: number[] } }
    return data.embedding.values
  }
}
