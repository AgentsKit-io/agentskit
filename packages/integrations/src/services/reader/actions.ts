import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

interface ReaderRuntimeConfig {
  apiKey?: string
  baseUrl?: string
  headers?: Record<string, string>
}

export const readerFetch = defineAction({
  name: 'reader_fetch',
  description: 'Fetch a URL and return its text content, ready to feed into an LLM.',
  sideEffect: 'read',
  schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  async execute(args, { fetch, config }) {
    const cfg = (config as ReaderRuntimeConfig | undefined) ?? {}
    const baseUrl = cfg.baseUrl ?? 'https://r.jina.ai'
    const headers: Record<string, string> = { accept: 'text/plain', ...cfg.headers }
    if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`
    const response = await fetch(`${baseUrl}/${String(args.url)}`, { headers })
    const text = await response.text()
    if (!response.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `reader ${response.status}: ${text.slice(0, 200)}` })
    }
    return text
  },
})

export const readerActions = [readerFetch]
