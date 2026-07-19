import type { EmbedFn } from '@agentskit/core'
import { embeddingError, requireEmbeddingVector, throwIfNotOk } from './shared'

export interface OllamaEmbedderConfig {
  model?: string
  baseUrl?: string
}

async function fetchAvailableModels(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl}/api/tags`
  const response = await fetch(url)
  await throwIfNotOk(response, 'ollama', url)
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
    return embeddingError('Ollama', `${originalError}. Available embedding models: ${list}`)
  } catch (fetchError) {
    return embeddingError('Ollama', `${originalError}. Could not fetch available models`, fetchError)
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
      void response.body?.cancel().catch(() => {})
      const message = `HTTP ${response.status}`
      throw await buildModelError(baseUrl, message)
    }

    const data = (await response.json()) as { embeddings?: unknown[] }
    const first = Array.isArray(data.embeddings) ? data.embeddings[0] : undefined
    return requireEmbeddingVector(first, 'Ollama')
  }
}
