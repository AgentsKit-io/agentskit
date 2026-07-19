import type { AdapterFactory, ToolDefinition } from '@agentskit/core'
import {
  anthropic,
  cerebras,
  cohere,
  deepseek,
  fireworks,
  gemini,
  grok,
  groq,
  huggingface,
  kimi,
  llamacpp,
  lmstudio,
  mistral,
  ollama,
  openai,
  openrouter,
  qwen,
  together,
  vllm,
} from '@agentskit/adapters'
import { dispatchFromCatalog } from '@agentskit/adapters/catalog'
import { fetchUrl, filesystem, shell, sqliteQueryTool, webSearch } from '@agentskit/tools'
import type { McpServer } from '@agentskit/tools/mcp'
import { createAgentTool } from './agent-tool'
import { createAgentsKitMcpServer } from './index'
import { fetchAgentSkill, type FetchedAgentSkill } from './registry-fetch'

const VALUE_FLAGS = new Set([
  '--agents', '--api-key', '--base-url', '--fs-root', '--max-steps', '--model',
  '--provider', '--sqlite', '--tools',
])
const BOOLEAN_FLAGS = new Set(['--allow-shell', '--help'])
const TOOL_IDS = new Set(['fetch', 'filesystem', 'search', 'shell', 'sqlite'])

export interface McpCliOptions {
  agents: string[]
  allowShell: boolean
  apiKey?: string
  baseUrl?: string
  fsRoot?: string
  help: boolean
  maxSteps: number
  model?: string
  provider: string
  sqlite?: string
  tools: string[]
}

export type McpCliParseResult =
  | { message: string; status: 'rejected' }
  | { options: McpCliOptions; status: 'parsed' }

const csv = (input: string): string[] =>
  [...new Set(input.split(',').map((value) => value.trim()).filter(Boolean))]

export const parseMcpCliArgs = (argv: readonly string[]): McpCliParseResult => {
  const values = new Map<string, string>()
  const booleans = new Set<string>()
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!
    if (BOOLEAN_FLAGS.has(argument)) {
      if (booleans.has(argument)) return { message: `duplicate flag: ${argument}`, status: 'rejected' }
      booleans.add(argument)
      continue
    }
    if (!VALUE_FLAGS.has(argument)) return { message: `unknown argument: ${argument}`, status: 'rejected' }
    if (values.has(argument)) return { message: `duplicate flag: ${argument}`, status: 'rejected' }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) {
      return { message: `missing value for ${argument}`, status: 'rejected' }
    }
    values.set(argument, value)
    index += 1
  }

  const tools = values.has('--tools') ? csv(values.get('--tools')!) : ['fetch', 'search']
  const unknownTool = tools.find((tool) => !TOOL_IDS.has(tool))
  if (unknownTool) return { message: `unknown tool: ${unknownTool}`, status: 'rejected' }
  const agents = values.has('--agents') ? csv(values.get('--agents')!) : []
  const maxStepsText = values.get('--max-steps') ?? '8'
  const maxSteps = Number(maxStepsText)
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 1 || maxSteps > 100) {
    return { message: '--max-steps must be a safe integer between 1 and 100', status: 'rejected' }
  }

  return {
    options: {
      agents,
      allowShell: booleans.has('--allow-shell'),
      apiKey: values.get('--api-key'),
      baseUrl: values.get('--base-url'),
      fsRoot: values.get('--fs-root'),
      help: booleans.has('--help'),
      maxSteps,
      model: values.get('--model'),
      provider: (values.get('--provider') ?? 'openai').toLowerCase(),
      sqlite: values.get('--sqlite'),
      tools,
    },
    status: 'parsed',
  }
}

type KeyedFactory = (config: { apiKey: string; baseUrl?: string; model: string }) => AdapterFactory
type LocalFactory = (config: { baseUrl?: string; model: string }) => AdapterFactory

const KEYED: Record<string, KeyedFactory> = {
  anthropic, cerebras, cohere, deepseek, fireworks, gemini, grok, groq,
  huggingface, kimi, llamacpp, lmstudio, mistral, openai, openrouter, qwen,
  together, vllm,
}
const LOCAL: Record<string, LocalFactory> = { ollama }
const LOCAL_COMPAT = new Set(['llamacpp', 'lmstudio', 'vllm'])
const DEFAULT_MODEL: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-2.0-flash',
  grok: 'grok-2',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-large-latest',
  ollama: 'llama3',
  openai: 'gpt-4o',
}

export interface McpCliDependencies {
  createServer?: typeof createAgentsKitMcpServer
  env?: Readonly<Record<string, string | undefined>>
  fetchSkill?: (id: string) => Promise<FetchedAgentSkill | null>
  warn?: (message: string) => void
}

export type McpCliRunResult =
  | { exitCode: 0; server: McpServer; status: 'started'; toolNames: string[] }
  | { exitCode: 0; status: 'help' }
  | { exitCode: 1; status: 'rejected' }

export const MCP_CLI_HELP = [
  'Usage: agentskit-mcp [options]',
  '--tools <fetch,search,filesystem,shell,sqlite>',
  '--agents <registry-ids> --provider <provider> --model <model>',
  '--fs-root <dir> --sqlite <file> --allow-shell',
].join('\n')

const buildPrimitiveTools = (options: McpCliOptions, warn: (message: string) => void): ToolDefinition[] => {
  const tools: ToolDefinition[] = []
  if (options.tools.includes('fetch')) tools.push(fetchUrl())
  if (options.tools.includes('search')) tools.push(webSearch())
  if (options.tools.includes('filesystem')) {
    if (options.fsRoot) tools.push(...filesystem({ basePath: options.fsRoot }))
    else warn('skipping "filesystem": pass --fs-root <dir>')
  }
  if (options.tools.includes('sqlite')) {
    if (options.sqlite) tools.push(sqliteQueryTool({ path: options.sqlite }))
    else warn('skipping "sqlite": pass --sqlite <file>')
  }
  if (options.tools.includes('shell')) {
    if (options.allowShell) tools.push(shell())
    else warn('skipping "shell": pass --allow-shell (runs commands)')
  }
  return tools
}

const resolveAdapter = (
  options: McpCliOptions,
  env: Readonly<Record<string, string | undefined>>,
  warn: (message: string) => void,
): AdapterFactory | null => {
  const model = options.model ?? DEFAULT_MODEL[options.provider]
  if (!model) {
    warn(`--agents needs a model for "${options.provider}": pass --model`)
    return null
  }
  const local = LOCAL[options.provider]
  if (local) return local({ baseUrl: options.baseUrl, model })

  const envName = `${options.provider.toUpperCase().replace(/-/g, '_')}_API_KEY`
  const apiKey = options.apiKey ?? env[envName] ?? (LOCAL_COMPAT.has(options.provider) ? 'local' : undefined)
  if (!apiKey) {
    warn(`--agents needs a key for "${options.provider}": pass --api-key or set ${envName}`)
    return null
  }
  const keyed = KEYED[options.provider]
  if (keyed) return keyed({ apiKey, baseUrl: options.baseUrl, model })
  try {
    return dispatchFromCatalog({ apiKey, baseUrl: options.baseUrl, model, provider: options.provider })
  } catch {
    warn(`unknown or incompatible provider "${options.provider}"`)
    return null
  }
}

export const runMcpCli = async (
  argv: readonly string[],
  dependencies: McpCliDependencies = {},
): Promise<McpCliRunResult> => {
  const warn = dependencies.warn ?? (() => undefined)
  const parsed = parseMcpCliArgs(argv)
  if (parsed.status === 'rejected') {
    warn(parsed.message)
    return { exitCode: 1, status: 'rejected' }
  }
  if (parsed.options.help) {
    warn(MCP_CLI_HELP)
    return { exitCode: 0, status: 'help' }
  }

  const tools = buildPrimitiveTools(parsed.options, warn)
  if (parsed.options.agents.length > 0) {
    const adapter = resolveAdapter(parsed.options, dependencies.env ?? process.env, warn)
    if (adapter) {
      const fetchSkill = dependencies.fetchSkill ?? fetchAgentSkill
      for (const id of parsed.options.agents) {
        const skill = await fetchSkill(id).catch(() => null)
        if (!skill) {
          warn(`skipping agent "${id}": not found or not runnable`)
          continue
        }
        tools.push(createAgentTool({ ...skill, adapter, maxSteps: parsed.options.maxSteps }))
      }
    }
  }

  if (tools.length === 0) {
    warn('no tools or agents enabled — nothing to serve')
    return { exitCode: 1, status: 'rejected' }
  }
  const seen = new Set<string>()
  const duplicate = tools.find((tool) => {
    if (seen.has(tool.name)) return true
    seen.add(tool.name)
    return false
  })
  if (duplicate) {
    warn(`duplicate tool name: ${duplicate.name}`)
    return { exitCode: 1, status: 'rejected' }
  }
  const createServer = dependencies.createServer ?? createAgentsKitMcpServer
  let server: McpServer
  try {
    server = createServer({
      tools,
      onEvent: (event) => {
        if (event.type === 'error') warn(`tool error (${event.tool ?? 'unknown'}): ${event.error ?? 'unknown'}`)
      },
    })
  } catch {
    warn('failed to start MCP server')
    return { exitCode: 1, status: 'rejected' }
  }
  const toolNames = tools.map((tool) => tool.name)
  warn(`serving ${toolNames.length} item(s) over stdio (${toolNames.join(', ')})`)
  return { exitCode: 0, server, status: 'started', toolNames }
}
