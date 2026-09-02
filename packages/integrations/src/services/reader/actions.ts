import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'
import { readResponseText } from '../../http'

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
  async execute(args, { fetchUntrusted, signal, config }) {
    const cfg = (config as ReaderRuntimeConfig | undefined) ?? {}
    const baseUrl = cfg.baseUrl ?? 'https://r.jina.ai'
    const headers: Record<string, string> = { accept: 'text/plain', ...cfg.headers }
    if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`
    if (!fetchUntrusted) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: 'reader_fetch: fetchUntrusted is required for model-controlled URLs',
        hint: 'Inject an egress-policy fetch as ProjectionConfig.fetchUntrusted.',
      })
    }
    const response = await fetchUntrusted(`${baseUrl}/${String(args.url)}`, { headers, signal, redirect: 'error' })
    const text = await readResponseText(response)
    if (!response.ok) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `reader ${response.status}: ${text.slice(0, 200)}` })
    }
    return text
  },
})

export const readerActions = [readerFetch]
