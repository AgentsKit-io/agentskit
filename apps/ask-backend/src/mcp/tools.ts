/**
 * MCP tool registry.
 *
 * Each tool is a small, independently testable function with explicit input
 * validation — no monolithic dispatch. The registry maps a tool name to its
 * advertised JSON-Schema definition plus its handler; `runTool` looks one up and
 * runs it. Adding a tool = one registry entry.
 */
import type { RetrievedDocument, Retriever } from '@agentskit/core'
import { askOnce } from './ask-once'
import { toolError, toolText, type ToolResult } from './jsonrpc'

/** A registered corpus: its retriever + the warm ask handler built over it. */
export interface McpCorpus {
  retriever: Retriever
  handler: (req: Request) => Promise<Response>
}

/** Per-IP limiter verdict (shape of the docs `rate-limit`). */
export interface RateVerdict {
  ok: boolean
  retryAfterSec?: number
}

/** Everything a tool handler needs, resolved fresh per request. */
export interface ToolContext {
  corpora: Record<string, McpCorpus>
  ip: string
  /** Limits the raw `search_docs` path (the LLM `ask` path is limited by its handler). */
  searchLimiter?: (ip: string) => Promise<RateVerdict>
}

const DEFAULT_CORPUS = 'docs'
const MAX_QUERY_CHARS = 2000
const DEFAULT_K = 6
const MAX_K = 20

// ── argument readers (declarative validation, no inline casts in handlers) ──────

/** A trimmed string arg, capped to `MAX_QUERY_CHARS`; `''` when absent/blank. */
function readQuery(args: Record<string, unknown>, key: string): string {
  const value = typeof args[key] === 'string' ? (args[key] as string).trim() : ''
  return value.length > MAX_QUERY_CHARS ? value.slice(0, MAX_QUERY_CHARS) : value
}

/** A bounded integer arg with a default. */
function readK(args: Record<string, unknown>): number {
  const value = typeof args.k === 'number' ? args.k : DEFAULT_K
  return Math.min(Math.max(1, Math.floor(value)), MAX_K)
}

/** Resolve `args.corpus` (default `docs`) to a corpus, or a typed error result. */
function resolveCorpus(
  args: Record<string, unknown>,
  corpora: Record<string, McpCorpus>,
): { cor: McpCorpus } | { error: ToolResult } {
  const id = typeof args.corpus === 'string' ? args.corpus : DEFAULT_CORPUS
  const cor = corpora[id]
  return cor ? { cor } : { error: toolError(`Unknown corpus: ${id}`) }
}

function toSearchResult(d: RetrievedDocument) {
  const meta = (d.metadata ?? {}) as { path?: string; title?: string }
  return { content: d.content, score: d.score, path: meta.path, title: meta.title }
}

// ── tool handlers ───────────────────────────────────────────────────────────────

function listCorpora(_args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  return toolText({ corpora: Object.keys(ctx.corpora) })
}

async function searchDocs(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const resolved = resolveCorpus(args, ctx.corpora)
  if ('error' in resolved) return resolved.error

  const query = readQuery(args, 'query')
  if (!query) return toolError('query is required')

  if (ctx.searchLimiter) {
    const rl = await ctx.searchLimiter(ctx.ip)
    if (!rl.ok) return toolError(`rate limited — retry in ${rl.retryAfterSec ?? 1}s`)
  }

  const docs = await resolved.cor.retriever.retrieve({ query, messages: [] })
  return toolText({ results: docs.slice(0, readK(args)).map(toSearchResult) })
}

async function ask(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const resolved = resolveCorpus(args, ctx.corpora)
  if ('error' in resolved) return resolved.error

  const question = readQuery(args, 'question')
  if (!question) return toolError('question is required')

  const { answer, sources } = await askOnce(resolved.cor.handler, question, ctx.ip)
  return toolText({ answer, sources })
}

// ── registry ─────────────────────────────────────────────────────────────────────

interface ToolSpec {
  definition: { name: string; description: string; inputSchema: Record<string, unknown> }
  run: (args: Record<string, unknown>, ctx: ToolContext) => ToolResult | Promise<ToolResult>
}

const REGISTRY: Record<string, ToolSpec> = {
  list_corpora: {
    definition: {
      name: 'list_corpora',
      description: 'List the AgentsKit knowledge bases this server can answer over.',
      inputSchema: { type: 'object', properties: {} },
    },
    run: listCorpora,
  },
  search_docs: {
    definition: {
      name: 'search_docs',
      description:
        'Retrieve the most relevant documentation chunks for a query (raw retrieval, no LLM). Returns content + source paths.',
      inputSchema: {
        type: 'object',
        properties: {
          corpus: { type: 'string', description: 'Knowledge base id (default "docs").' },
          query: { type: 'string', description: 'The search query.' },
          k: { type: 'integer', minimum: 1, maximum: MAX_K, description: 'Max chunks (default 6).' },
        },
        required: ['query'],
      },
    },
    run: searchDocs,
  },
  ask: {
    definition: {
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
    run: ask,
  },
}

/** The tool definitions advertised via `tools/list`. */
export const TOOL_DEFINITIONS = Object.values(REGISTRY).map((t) => t.definition)

/** Run a tool by name, or return a typed error for an unknown tool. */
export function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): ToolResult | Promise<ToolResult> {
  const tool = REGISTRY[name]
  return tool ? tool.run(args, ctx) : toolError(`Unknown tool: ${name}`)
}
