import { access, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve, join } from 'node:path'

export interface AgentsKitConfig {
  tools?: {
    filesystem?: { basePath?: string }
    shell?: { allowed?: string[]; timeout?: number; maxOutput?: number }
    webSearch?: { provider?: string; maxResults?: number }
  }
  defaults?: {
    provider?: string
    model?: string
    /** Reserved — prefer `apiKeyEnv` so keys stay out of committed configs. */
    apiKey?: string
    /** Name of the env var holding the API key, e.g. `OPENROUTER_API_KEY`. */
    apiKeyEnv?: string
    baseUrl?: string
    tools?: string
    skill?: string
    system?: string
    memoryBackend?: string
  }
  runtime?: {
    maxSteps?: number
    maxDelegationDepth?: number
  }
  observability?: {
    console?: boolean | { format?: 'human' | 'json' }
    langsmith?: { projectName?: string }
  }
  /**
   * Plugin specifiers. Each entry is a package name (`@org/plugin`) or
   * a relative/absolute path to a module exporting a `Plugin`.
   */
  plugins?: string[]
  /**
   * Shell-based hooks keyed by event name. See `extensibility/hooks`.
   */
  hooks?: Record<string, Array<{ run: string; matcher?: string; timeout?: number }>>
  /**
   * Retrieval-augmented generation config. Indexes files via
   * `agentskit rag index`. Chat-side auto-retrieval lands in a later phase.
   */
  rag?: {
    enabled?: boolean
    backend?: 'memory' | 'file'
    dir?: string
    sources?: string[]
    embedder?: { provider?: string; model?: string; apiKey?: string; baseUrl?: string }
    chunkSize?: number
    topK?: number
  }
  /**
   * MCP servers to spawn on chat start. Tools list + call bridge
   * them into the runtime tool set as `<serverName>__<toolName>`.
   */
  mcp?: {
    servers?: Record<string, { command: string; args?: string[]; env?: Record<string, string>; timeout?: number }>
  }
  /**
   * Tool permission policy. See `extensibility/permissions`.
   */
  permissions?: {
    mode?: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions'
    rules?: Array<{
      tool: string
      action: 'allow' | 'ask' | 'deny'
      scope?: 'session' | 'project' | 'global'
    }>
  }
}

async function loadJsonConfig(path: string): Promise<AgentsKitConfig | undefined> {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as AgentsKitConfig
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new Error(`Failed to load JSON config ${path}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function loadTsConfig(path: string): Promise<AgentsKitConfig | undefined> {
  try {
    await access(path)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw err
  }
  try {
    const mod = await import(`${path}?agentskit_config=${Date.now()}`)
    return (mod.default ?? mod) as AgentsKitConfig
  } catch (err) {
    throw new Error(`Failed to load TypeScript config ${path}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function loadPackageJsonConfig(dir: string): Promise<AgentsKitConfig | undefined> {
  try {
    const raw = await readFile(join(dir, 'package.json'), 'utf8')
    const pkg = JSON.parse(raw) as Record<string, unknown>
    if (pkg.agentskit && typeof pkg.agentskit === 'object') {
      return pkg.agentskit as AgentsKitConfig
    }
    return undefined
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new Error(`Failed to load package.json config ${dir}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export interface LoadConfigOptions {
  cwd?: string
  /**
   * Root directory to read the global config from. Defaults to `~`. Tests
   * pass a tmpdir here so the user's real `~/.agentskit/config.json` can't
   * contaminate results. Pass `null` to disable global config entirely.
   */
  home?: string | null
}

function mergeConfigs(
  base: AgentsKitConfig | undefined,
  override: AgentsKitConfig | undefined,
): AgentsKitConfig | undefined {
  if (!base && !override) return undefined
  if (!base) return override
  if (!override) return base
  const merge = (left: unknown, right: unknown): unknown => {
    if (!left || typeof left !== 'object' || Array.isArray(left)) return right
    if (!right || typeof right !== 'object' || Array.isArray(right)) return right
    const out: Record<string, unknown> = { ...(left as Record<string, unknown>) }
    for (const [key, value] of Object.entries(right as Record<string, unknown>)) {
      out[key] = key in out ? merge(out[key], value) : value
    }
    return out
  }
  return merge(base, override) as AgentsKitConfig
}

async function loadLocalConfig(cwd: string): Promise<AgentsKitConfig | undefined> {
  const tsConfig = await loadTsConfig(join(cwd, '.agentskit.config.ts'))
  const jsonConfig = await loadJsonConfig(join(cwd, '.agentskit.config.json'))
  const packageConfig = await loadPackageJsonConfig(cwd)
  return mergeConfigs(mergeConfigs(packageConfig, jsonConfig), tsConfig)
}

async function loadGlobalConfig(home: string | null | undefined): Promise<AgentsKitConfig | undefined> {
  if (home === null) return undefined
  const globalDir = join(home ?? homedir(), '.agentskit')
  const tsConfig = await loadTsConfig(join(globalDir, 'config.ts'))
  if (tsConfig) return tsConfig
  return await loadJsonConfig(join(globalDir, 'config.json'))
}

/**
 * Load an AgentsKit config file. Node-only — uses fs/promises.
 *
 * Merges in precedence order (later wins):
 *   1. `~/.agentskit/config.(ts|json)` — user-wide defaults
 *   2. `.agentskit.config.ts` in cwd
 *   3. `.agentskit.config.json` in cwd
 *   4. `"agentskit"` field in `package.json`
 *
 * Returns `undefined` if nothing is found.
 */
export async function loadConfig(options?: LoadConfigOptions): Promise<AgentsKitConfig | undefined> {
  const cwd = resolve(options?.cwd ?? process.cwd())
  const global = await loadGlobalConfig(options?.home)
  const local = await loadLocalConfig(cwd)
  return mergeConfigs(global, local)
}

const SECRET_KEY = /^(api[-_]?key|token|secret|password|authorization|private[-_]?key)$/i
const SECRET_ENV_KEY = /(?:^|_)(?:api_?key|token|secret|password|authorization|private_?key)$/i

function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key) || SECRET_ENV_KEY.test(key)
}

/** Return a display-safe copy; secrets are never printed by default. */
export function redactConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactConfig)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      isSecretKey(key) ? '[REDACTED]' : redactConfig(child),
    ]),
  )
}
