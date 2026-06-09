import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

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
  async execute(args, { fetch, config }) {
    const cfg = config as WhisperRuntimeConfig
    const baseUrl = cfg.baseUrl ?? 'https://api.openai.com/v1'
    const audio = await fetch(String(args.url))
    if (!audio.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `whisper: audio fetch ${audio.status}`, hint: `URL ${String(args.url)}.` })
    }
    const bytes = await audio.arrayBuffer()
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'audio')
    form.append('model', cfg.model ?? 'whisper-1')
    if (args.language) form.append('language', String(args.language))
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, ...cfg.headers },
      body: form,
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
