import { defineTool } from '@agentskit/core'
import type { HttpToolOptions } from './http'

export interface WhisperConfig extends HttpToolOptions {
  apiKey: string
  /** Default model — 'whisper-1' for legacy, 'gpt-4o-mini-transcribe' for newer. */
  model?: string
}

/**
 * Whisper (OpenAI transcription) + generic Deepgram alternative
 * share the "send audio → get text" shape. We keep them as two
 * distinct factories so the agent-side schema stays provider-named.
 */
export function whisperTranscribe(config: WhisperConfig) {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1'

  return defineTool({
    name: 'whisper_transcribe',
    description: 'Transcribe audio from a URL using OpenAI Whisper.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        language: { type: 'string' },
      },
      required: ['url'],
    } as const,
    async execute({ url, language }) {
      const audio = await fetchImpl(String(url))
      if (!audio.ok) throw new Error(`whisper: audio fetch ${audio.status}`)
      const bytes = await audio.arrayBuffer()
      const form = new FormData()
      form.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'audio')
      form.append('model', config.model ?? 'whisper-1')
      if (language) form.append('language', language as string)

      const response = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${config.apiKey}`, ...config.headers },
        body: form,
      })
      const text = await response.text()
      if (!response.ok) throw new Error(`whisper ${response.status}: ${text.slice(0, 200)}`)
      try {
        const parsed = JSON.parse(text) as { text: string }
        return { text: parsed.text }
      } catch {
        return { text }
      }
    },
  })
}

export function whisper(config: WhisperConfig) {
  return [whisperTranscribe(config)]
}
