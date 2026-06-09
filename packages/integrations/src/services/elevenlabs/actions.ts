import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface ElevenLabsRuntimeConfig {
  apiKey: string
  baseUrl?: string
  headers?: Record<string, string>
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export const elevenlabsTts = defineAction({
  name: 'elevenlabs_tts',
  description: 'Generate speech audio from text with a chosen ElevenLabs voice.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      voice_id: { type: 'string' },
      text: { type: 'string' },
      model: { type: 'string', description: 'e.g. eleven_multilingual_v2' },
    },
    required: ['voice_id', 'text'],
  },
  async execute(args, { fetch, config }) {
    const cfg = config as ElevenLabsRuntimeConfig
    const baseUrl = cfg.baseUrl ?? 'https://api.elevenlabs.io/v1'
    const response = await fetch(`${baseUrl}/text-to-speech/${String(args.voice_id)}`, {
      method: 'POST',
      headers: { 'xi-api-key': cfg.apiKey, 'content-type': 'application/json', accept: 'audio/mpeg', ...cfg.headers },
      body: JSON.stringify({ text: args.text, model_id: args.model ?? 'eleven_multilingual_v2' }),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `elevenlabs ${response.status}: ${detail.slice(0, 200)}` })
    }
    const buf = new Uint8Array(await response.arrayBuffer())
    return { contentType: 'audio/mpeg', bytesBase64: bytesToBase64(buf), length: buf.byteLength }
  },
})

export const elevenlabsActions = [elevenlabsTts]
