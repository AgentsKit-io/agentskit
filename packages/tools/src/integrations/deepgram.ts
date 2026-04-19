import { defineTool } from '@agentskit/core'
import type { HttpToolOptions } from './http'

export interface DeepgramConfig extends HttpToolOptions {
  apiKey: string
}

/**
 * Deepgram transcription. Send a URL; get back transcript text +
 * word-level segments.
 */
export function deepgramTranscribe(config: DeepgramConfig) {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const baseUrl = config.baseUrl ?? 'https://api.deepgram.com/v1'

  return defineTool({
    name: 'deepgram_transcribe',
    description: 'Transcribe audio by URL using Deepgram.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        model: { type: 'string', description: 'e.g. nova-3' },
        language: { type: 'string' },
      },
      required: ['url'],
    } as const,
    async execute({ url, model, language }) {
      const response = await fetchImpl(`${baseUrl}/listen`, {
        method: 'POST',
        headers: {
          authorization: `Token ${config.apiKey}`,
          'content-type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          url,
          model: model ?? 'nova-3',
          language,
          smart_format: true,
        }),
      })
      const text = await response.text()
      if (!response.ok) throw new Error(`deepgram ${response.status}: ${text.slice(0, 200)}`)
      const data = JSON.parse(text) as {
        results?: {
          channels?: Array<{
            alternatives?: Array<{ transcript?: string; words?: unknown[] }>
          }>
        }
      }
      const first = data.results?.channels?.[0]?.alternatives?.[0]
      return { text: first?.transcript ?? '', words: first?.words ?? [] }
    },
  })
}

export function deepgram(config: DeepgramConfig) {
  return [deepgramTranscribe(config)]
}
