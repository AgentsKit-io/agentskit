#!/usr/bin/env node
import type { AdapterFactory, ToolDefinition } from '@agentskit/core'
import { fetchUrl, webSearch, filesystem, shell, sqliteQueryTool } from '@agentskit/tools'
import {
  anthropic, gemini, openai, deepseek, grok, groq, mistral, cohere, together,
  fireworks, openrouter, cerebras, kimi, huggingface, qwen,
  ollama, lmstudio, vllm, llamacpp,
} from '@agentskit/adapters'
import { dispatchFromCatalog } from '@agentskit/adapters/catalog'
import { createAgentsKitMcpServer } from './index'
import { createAgentTool } from './agent-tool'
import { fetchAgentSkill } from './registry-fetch'

/**
 * `agentskit-mcp` — start an MCP server exposing AgentsKit tools and/or agents.
 *
 *   --tools <a,b>     primitive tools (default: fetch,search; also filesystem/shell/sqlite)
 *   --fs-root <dir>   root for the filesystem tool
 *   --sqlite <file>   database file for the sqlite tool
 *   --allow-shell     enable the shell tool
 *   --agents <a,b>    expose registry agents as tools (each runs server-side)
 *   --provider <p>    model for --agents: openai | anthropic | gemini | ollama (default openai)
 *   --model <m>       model name for --agents
 *   --api-key <k>     key for --agents (else the provider's env var)
 *
 * stdout is the MCP JSON-RPC channel; all human output goes to stderr.
 */
const warn = (msg: string) => process.stderr.write(`agentskit-mcp: ${msg}\n`)
const flag = (name: string): string | undefined => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const has = (name: string): boolean => process.argv.includes(name)

function buildTools(): ToolDefinition[] {
  if (!has('--tools')) return [fetchUrl(), webSearch()]
  const requested = (flag('--tools') ?? '').split(',').map((s) => s.trim())
  const tools: ToolDefinition[] = []
  if (requested.includes('fetch')) tools.push(fetchUrl())
  if (requested.includes('search')) tools.push(webSearch())
  if (requested.includes('filesystem')) {
    const root = flag('--fs-root')
    if (root) tools.push(...filesystem({ basePath: root }))
    else warn('skipping "filesystem": pass --fs-root <dir>')
  }
  if (requested.includes('sqlite')) {
    const file = flag('--sqlite')
    if (file) tools.push(sqliteQueryTool({ path: file }))
    else warn('skipping "sqlite": pass --sqlite <file>')
  }
  if (requested.includes('shell')) {
    if (has('--allow-shell')) tools.push(shell())
    else warn('skipping "shell": pass --allow-shell (runs commands)')
  }
  return tools
}

type KeyedFactory = (cfg: { apiKey: string; model: string; baseUrl?: string }) => AdapterFactory
type LocalFactory = (cfg: { model: string; baseUrl?: string }) => AdapterFactory

/** Providers that take { apiKey, model } — first-class + OpenAI-compatible (hosted + local-OpenAI-compat). */
const KEYED: Record<string, KeyedFactory> = {
  openai, anthropic, gemini, deepseek, grok, groq, mistral, cohere, together,
  fireworks, openrouter, cerebras, kimi, huggingface, qwen,
  lmstudio, vllm, llamacpp,
}
/** Local providers whose adapter needs no key. */
const LOCAL: Record<string, LocalFactory> = { ollama }
/** Local OpenAI-compatible servers — key is a placeholder. */
const LOCAL_COMPAT = new Set(['lmstudio', 'vllm', 'llamacpp'])

const DEFAULT_MODEL: Record<string, string> = {
  openai: 'gpt-4o', anthropic: 'claude-sonnet-4-6', gemini: 'gemini-2.0-flash',
  deepseek: 'deepseek-chat', grok: 'grok-2', groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-large-latest', ollama: 'llama3',
}

function resolveAdapter(): AdapterFactory | null {
  const provider = flag('--provider') ?? 'openai'
  const model = flag('--model') ?? DEFAULT_MODEL[provider]
  if (!model) {
    warn(`--agents needs a model for "${provider}": pass --model`)
    return null
  }
  const baseUrl = flag('--base-url')

  if (LOCAL[provider]) return LOCAL[provider]({ model, baseUrl })

  const apiKey =
    flag('--api-key') ??
    process.env[`${provider.toUpperCase().replace(/-/g, '_')}_API_KEY`] ??
    (LOCAL_COMPAT.has(provider) ? 'local' : undefined)
  if (!apiKey) {
    warn(`--agents needs a key for "${provider}": pass --api-key or set ${provider.toUpperCase()}_API_KEY`)
    return null
  }
  if (KEYED[provider]) return KEYED[provider]({ apiKey, model })

  // Long tail: any other OpenAI-compatible provider in the models.dev catalog.
  try {
    return dispatchFromCatalog({ provider, model, apiKey, baseUrl })
  } catch {
    warn(`unknown provider "${provider}". Known: ${[...Object.keys(KEYED), ...Object.keys(LOCAL)].join(', ')}, or any catalog OpenAI-compatible provider.`)
    return null
  }
}

async function buildAgentTools(): Promise<ToolDefinition[]> {
  const ids = (flag('--agents') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) return []
  const adapter = resolveAdapter()
  if (!adapter) return []
  const tools: ToolDefinition[] = []
  for (const id of ids) {
    const skill = await fetchAgentSkill(id)
    if (!skill) {
      warn(`skipping agent "${id}": not found or not runnable (tool-composing agent)`)
      continue
    }
    tools.push(
      createAgentTool({ id: skill.id, description: skill.description, systemPrompt: skill.systemPrompt, adapter }),
    )
  }
  return tools
}

async function main(): Promise<void> {
  const tools = [...buildTools(), ...(await buildAgentTools())]
  if (tools.length === 0) {
    warn('no tools or agents enabled — nothing to serve. See --tools / --agents.')
    process.exit(1)
  }
  createAgentsKitMcpServer({
    tools,
    onEvent: (e) => {
      if (e.type === 'error') warn(`tool error (${e.tool}): ${e.error}`)
    },
  })
  warn(`serving ${tools.length} item(s) over stdio (${tools.map((t) => t.name).join(', ')})`)
}

void main()
