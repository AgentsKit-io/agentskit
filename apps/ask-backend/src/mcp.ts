/**
 * MCP endpoint for the central Ask backend (RFC-0007 F3).
 *
 * A hand-rolled JSON-RPC 2.0 server over POST (streamable-http), mirroring the
 * registry MCP (`apps/registry/app/api/mcp`) so agents query AgentsKit knowledge
 * with the same transport. Read-only, public, CORS `*` — it serves the same
 * public docs knowledge the chat does, over the same corpus registry.
 *
 * Tools (over every registered corpus):
 *   - list_corpora()                      → available knowledge bases
 *   - search_docs({ corpus, query, k })   → relevant chunks + source paths (raw retrieval)
 *   - ask({ corpus, question })           → a grounded, cited answer (non-streaming)
 *
 * `ask` reuses the per-corpus `createAskHandler` unchanged: it drives the handler
 * with a one-shot request and collapses the NDJSON `UiEvent` stream into a single
 * markdown answer + sources — MCP clients get one JSON result, not a stream.
 */
import type { RetrievedDocument, Retriever } from '@agentskit/core'
import { decodeEvents } from '../../docs-next/lib/ask/protocol'

/** A registered corpus: its retriever + the warm ask handler built over it. */
export interface McpCorpus {
  retriever: Retriever
  handler: (req: Request) => Promise<Response>
}

/** Per-IP limiter verdict (shape of `@agentskit/.../rate-limit`). */
interface RateVerdict {
  ok: boolean
  retryAfterSec?: number
}

export interface McpOptions {
  /** Rate-limit the raw `search_docs` tool per client IP (the LLM `ask` path is
   *  limited by the underlying ask handler instead). */
  searchLimiter?: (ip: string) => Promise<RateVerdict>
}

/** Cap free-text inputs so a single call can't drive unbounded embedding work. */
const MAX_QUERY_CHARS = 2000

/** Spoof-resistant client IP (see server.ts `clientIp` — rightmost XFF / x-real-ip). */
function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]!
  }
  return 'unknown'
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-protocol-version',
}

const TOOLS = [
  {
    name: 'list_corpora',
    description: 'List the AgentsKit knowledge bases this server can answer over.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_docs',
    description:
      'Retrieve the most relevant documentation chunks for a query (raw retrieval, no LLM). Returns content + source paths.',
    inputSchema: {
      type: 'object',
      properties: {
        corpus: { type: 'string', description: 'Knowledge base id (default "docs").' },
        query: { type: 'string', description: 'The search query.' },
        k: { type: 'integer', minimum: 1, maximum: 20, description: 'Max chunks (default 6).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'ask',
    description:
      'Ask a question and get a grounded, cited answer synthesised from the corpus (non-streaming).',
    inputSchema: {
      type: 'object',
      properties: {
        corpus: { type: 'string', description: 'Knowledge base id (default "docs").' },
        question: { type: 'string', description: 'The question to answer.' },
      },
      required: ['question'],
    },
  },
]

const text = (obj: unknown) => ({
  content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }],
})
const err = (m: string) => ({ isError: true, content: [{ type: 'text', text: m }] })

function sourcePath(d: RetrievedDocument): string | undefined {
  return (d.metadata as { path?: string } | undefined)?.path
}
function sourceTitle(d: RetrievedDocument): string | undefined {
  return (d.metadata as { title?: string } | undefined)?.title
}

/** Drive the warm ask handler one-shot and collapse the stream into a final answer. */
async function askOnce(
  handler: (req: Request) => Promise<Response>,
  question: string,
  ip: string,
): Promise<{ answer: string; sources: Array<{ title?: string; path?: string; anchor?: string }> }> {
  // Forward the trusted caller IP as `x-real-ip` (the handler reads it first) so its
  // own per-IP rate-limit + guards attribute correctly — without this every MCP
  // `ask` shares one "unknown" bucket.
  const req = new Request('http://ask.local/v1/ask?corpus=mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
  })
  const res = await handler(req)
  if (res.status === 429) throw new Error('rate limited — slow down and retry shortly')
  const body = await res.text()

  let answer = ''
  const sources: Array<{ title?: string; path?: string; anchor?: string }> = []
  const { events } = decodeEvents(body.endsWith('\n') ? body : body + '\n')
  for (const ev of events) {
    if (ev.type === 'text') answer += ev.delta
    else if (ev.type === 'tool' && ev.name === 'answer') {
      const md = (ev.args as { markdown?: string }).markdown
      if (typeof md === 'string') answer += md
    } else if (ev.type === 'tool' && ev.name === 'cite') {
      const cited = (ev.args as { sources?: Array<{ title?: string; path?: string; anchor?: string }> })
        .sources
      if (Array.isArray(cited)) sources.push(...cited)
    } else if (ev.type === 'error') {
      throw new Error(ev.message)
    }
  }
  return { answer: answer.trim(), sources }
}

/** Build the MCP request handler over the given corpus registry. */
export function createMcpHandler(corpora: Record<string, McpCorpus>, opts: McpOptions = {}) {
  const DEFAULT = 'docs'

  async function callTool(name: string, args: Record<string, unknown>, ip: string) {
    switch (name) {
      case 'list_corpora':
        return text({ corpora: Object.keys(corpora) })
      case 'search_docs': {
        const corpus = (args.corpus as string) ?? DEFAULT
        const cor = corpora[corpus]
        if (!cor) return err(`Unknown corpus: ${corpus}`)
        let query = typeof args.query === 'string' ? args.query.trim() : ''
        if (!query) return err('query is required')
        if (query.length > MAX_QUERY_CHARS) query = query.slice(0, MAX_QUERY_CHARS)
        // Raw retrieval skips the ask handler, so rate-limit it here per IP.
        if (opts.searchLimiter) {
          const rl = await opts.searchLimiter(ip)
          if (!rl.ok) return err(`rate limited — retry in ${rl.retryAfterSec ?? 1}s`)
        }
        const k = typeof args.k === 'number' ? Math.min(Math.max(1, args.k), 20) : 6
        const docs = await cor.retriever.retrieve({ query, messages: [] })
        return text({
          results: docs.slice(0, k).map((d) => ({
            content: d.content,
            score: d.score,
            path: sourcePath(d),
            title: sourceTitle(d),
          })),
        })
      }
      case 'ask': {
        const corpus = (args.corpus as string) ?? DEFAULT
        const cor = corpora[corpus]
        if (!cor) return err(`Unknown corpus: ${corpus}`)
        let question = typeof args.question === 'string' ? args.question.trim() : ''
        if (!question) return err('question is required')
        if (question.length > MAX_QUERY_CHARS) question = question.slice(0, MAX_QUERY_CHARS)
        const { answer, sources } = await askOnce(cor.handler, question, ip)
        return text({ answer, sources })
      }
      default:
        return err(`Unknown tool: ${name}`)
    }
  }

  async function handleRpc(msg: { id?: unknown; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } }, ip: string) {
    const { id, method, params } = msg ?? {}
    const reply = (result: unknown) => ({ jsonrpc: '2.0', id, result })
    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'agentskit-ask', version: '1.0.0' },
        })
      case 'ping':
        return reply({})
      case 'tools/list':
        return reply({ tools: TOOLS })
      case 'tools/call':
        try {
          return reply(await callTool(params?.name ?? '', params?.arguments ?? {}, ip))
        } catch (e) {
          return reply(err(e instanceof Error ? e.message : String(e)))
        }
      default:
        if (typeof method === 'string' && method.startsWith('notifications/')) return null
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }
    }
  }

  return async function mcp(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (req.method === 'GET') {
      return Response.json(
        {
          name: 'AgentsKit Ask MCP',
          transport: 'streamable-http (JSON-RPC over POST)',
          tools: TOOLS.map((t) => t.name),
        },
        { headers: CORS },
      )
    }
    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return Response.json(
        { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
        { status: 400, headers: CORS },
      )
    }
    const ip = clientIp(req)
    const out = Array.isArray(payload)
      ? (await Promise.all(payload.map((m) => handleRpc(m, ip)))).filter(Boolean)
      : await handleRpc(payload as Parameters<typeof handleRpc>[0], ip)
    if (out == null || (Array.isArray(out) && out.length === 0)) {
      return new Response(null, { status: 202, headers: CORS })
    }
    return Response.json(out, { headers: CORS })
  }
}
