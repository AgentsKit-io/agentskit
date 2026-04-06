import type { EmbedFn } from '@agentskit/core'

export interface OllamaEmbedderConfig {
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/tags`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = (await response.json()) as { models: Array<{ name: string }> }
  return data.models
    .map(m => m.name)
    .filter(name => name.includes('embed'))
    .sort()
}

async function buildModelError(
  baseUrl: string,
  originalError: string,
): Promise<Error> {
  try {
    const models = await fetchAvailableModels(baseUrl)
    const list = models.length > 0 ? models.join(', ') : 'none found'
    return new Error(
      `Ollama embedding failed: ${originalError}. Available embedding models: ${list}`,
    )
  } catch (fetchError) {
    return new Error(
      `Ollama embedding failed: ${originalError}. Could not fetch available models: ${(fetchError as Error).message}`,
    )
  }
}

export function ollamaEmbedder(config: OllamaEmbedderConfig): EmbedFn {
  const { model = 'nomic-embed-text', baseUrl = 'http://localhost:11434' } = config

  return async (text: string): Promise<number[]> => {
    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text }),
    })

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as { error?: string }
      const message = errorBody.error ?? `HTTP ${response.status}`
      throw await buildModelError(baseUrl, message)
    }

    const data = (await response.json()) as { embeddings: number[][] }
    return data.embeddings[0]
  }
}
