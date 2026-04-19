import { defineTool } from '@agentskit/core'
import type { HttpToolOptions } from './http'

export interface ElevenLabsConfig extends HttpToolOptions {
  apiKey: string
}

/**
 * ElevenLabs text-to-speech. Returns raw audio bytes as base64 so
 * the result is safe to embed in JSON tool results. The agent /
 * caller is responsible for persisting or streaming the output.
 */
export function elevenlabsTts(config: ElevenLabsConfig) {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const baseUrl = config.baseUrl ?? 'https://api.elevenlabs.io/v1'

  return defineTool({
    name: 'elevenlabs_tts',
    description: 'Generate speech audio from text with a chosen ElevenLabs voice.',
    schema: {
      type: 'object',
      properties: {
        voice_id: { type: 'string' },
        text: { type: 'string' },
        model: { type: 'string', description: 'e.g. eleven_multilingual_v2' },
      },
      required: ['voice_id', 'text'],
    } as const,
    async execute({ voice_id, text, model }) {
      const response = await fetchImpl(`${baseUrl}/text-to-speech/${voice_id as string}`, {
        method: 'POST',
        headers: {
          'xi-api-key': config.apiKey,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
          ...config.headers,
        },
        body: JSON.stringify({
          text,
          model_id: model ?? 'eleven_multilingual_v2',
        }),
      })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`elevenlabs ${response.status}: ${detail.slice(0, 200)}`)
      }
      const buf = new Uint8Array(await response.arrayBuffer())
      const b64 = bytesToBase64(buf)
      return { contentType: 'audio/mpeg', bytesBase64: b64, length: buf.byteLength }
    },
  })
}

export function elevenlabs(config: ElevenLabsConfig) {
  return [elevenlabsTts(config)]
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
