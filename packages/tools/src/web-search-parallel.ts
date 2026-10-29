import { ErrorCodes, ToolError } from '@agentskit/core'
import { parseSSE } from '@agentskit/net'
import { createMcpClient } from './mcp/client'
import type { McpClient } from './mcp/client'
import type { JsonRpcMessage, McpTransport } from './mcp/types'
import { requestText, SNIPPET_MAX, withDeadline } from './web-search'
import type { SearchRuntimeConfig, WebSearchResult } from './web-search'

const PARALLEL_MCP_URL = 'https://search.parallel.ai/mcp'

/** One-shot streamable-HTTP MCP transport; each request honours the search deadline, signal, and byte cap. */
function createParallelTransport(config: SearchRuntimeConfig): McpTransport {
  const handlers = new Set<(message: JsonRpcMessage) => void>()
  return {
    async send(message) {
      const { response, text } = await requestText(PARALLEL_MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify(message),
      }, config)
      if (!response.ok) {
        throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `Parallel Search MCP error: ${response.status}` })
      }
      const payloads: string[] = []
      if ((response.headers.get('content-type') ?? '').includes('text/event-stream')) {
        for await (const event of parseSSE(new Response(text).body!)) payloads.push(event.data)
      } else {
        payloads.push(text)
      }
      for (const payload of payloads) {
        if (!payload) continue
        let parsed: JsonRpcMessage
        try {
          parsed = JSON.parse(payload) as JsonRpcMessage
        } catch {
          throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'Parallel Search MCP returned an invalid response' })
        }
        for (const handler of handlers) handler(parsed)
      }
    },
    onMessage(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
  }
}

/** Search via Parallel Search MCP (Fast mode); every failure is thrown to the caller. */
export async function parallelSearch(
  query: string,
  maxResults: number,
  sessionId: string,
  config: SearchRuntimeConfig,
  hostClient?: McpClient,
): Promise<WebSearchResult[]> {
  const client = hostClient ?? createMcpClient({ transport: createParallelTransport(config), requestTimeoutMs: config.timeoutMs + 1000 })
  const call = client.callTool('web_search', { objective: query, search_queries: [query], session_id: sessionId })
  let result: Awaited<typeof call>
  try {
    result = await withDeadline(call, config)
  } finally {
    // A host-owned client stays open; calls we abandon are left to its own request timeout.
    if (!hostClient) void client.close()
  }
  const body = result.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') ?? ''
  if (result.isError) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `Parallel Search MCP error: ${body.slice(0, 200) || 'tool call failed'}` })
  }
  let data: { results?: Array<{ title?: string; url?: string; excerpts?: unknown }> }
  try {
    data = JSON.parse(body)
  } catch {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'Parallel Search MCP returned an invalid response' })
  }
  return (Array.isArray(data.results) ? data.results : []).slice(0, maxResults).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: (Array.isArray(r.excerpts) ? r.excerpts.filter((e): e is string => typeof e === 'string').join(' ') : '')
      .replace(/\s+/g, ' ').trim().slice(0, SNIPPET_MAX),
  }))
}
