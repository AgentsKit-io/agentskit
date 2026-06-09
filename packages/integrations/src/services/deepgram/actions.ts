import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface DeepgramRuntimeConfig {
  apiKey: string
  baseUrl?: string
  headers?: Record<string, string>
}

export const deepgramTranscribe = defineAction({
  name: 'deepgram_transcribe',
  description: 'Transcribe audio by URL using Deepgram.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      model: { type: 'string', description: 'e.g. nova-3' },
      language: { type: 'string' },
    },
    required: ['url'],
  },
  async execute(args, { fetch, config }) {
    const cfg = config as DeepgramRuntimeConfig
    const baseUrl = cfg.baseUrl ?? 'https://api.deepgram.com/v1'
    const response = await fetch(`${baseUrl}/listen`, {
      method: 'POST',
      headers: { authorization: `Token ${cfg.apiKey}`, 'content-type': 'application/json', ...cfg.headers },
      body: JSON.stringify({ url: args.url, model: args.model ?? 'nova-3', language: args.language, smart_format: true }),
    })
    const text = await response.text()
    if (!response.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `deepgram ${response.status}: ${text.slice(0, 200)}` })
    }
    const data = JSON.parse(text) as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; words?: unknown[] }> }> }
    }
    const first = data.results?.channels?.[0]?.alternatives?.[0]
    return { text: first?.transcript ?? '', words: first?.words ?? [] }
  },
})

export const deepgramActions = [deepgramTranscribe]
