import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'
import { readResponseBytes } from '../../http'

interface WhisperRuntimeConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  headers?: Record<string, string>
}

export const whisperTranscribe = defineAction({
  name: 'whisper_transcribe',
  description: 'Transcribe audio from a URL using OpenAI Whisper.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: { url: { type: 'string' }, language: { type: 'string' } },
    required: ['url'],
  },
  async execute(args, { fetch, fetchUntrusted, signal, maxResponseBytes, config }) {
    const cfg = config as WhisperRuntimeConfig
    const responseLimit = maxResponseBytes ?? 2 * 1024 * 1024
    const baseUrl = cfg.baseUrl ?? 'https://api.openai.com/v1'
    if (!fetchUntrusted) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: 'whisper_transcribe: fetchUntrusted is required for model-controlled audio URLs',
        hint: 'Inject an egress-policy fetch as ProjectionConfig.fetchUntrusted (or IntegrationActionContext.fetchUntrusted) when using @agentskit/integrations directly.',
      })
    }
    const audio = await fetchUntrusted(String(args.url), { signal })
    if (!audio.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `whisper: audio fetch ${audio.status}`, hint: `URL ${String(args.url)}.` })
    }
    const bytes = await readResponseBytes(audio, responseLimit)
    const form = new FormData()
    const audioBuffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(audioBuffer).set(bytes)
    form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio')
    form.append('model', cfg.model ?? 'whisper-1')
    if (args.language) form.append('language', String(args.language))
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, ...cfg.headers },
      body: form,
      signal,
      redirect: 'error',
    })
    const text = await response.text()
    if (!response.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `whisper ${response.status}: ${text.slice(0, 200)}` })
    }
    try {
      const parsed = JSON.parse(text) as { text: string }
      return { text: parsed.text }
    } catch {
      return { text }
    }
  },
})

export const whisperActions = [whisperTranscribe]
