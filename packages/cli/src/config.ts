import { readFile } from 'node:fs/promises'
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
}

async function loadJsonConfig(path: string): Promise<AgentsKitConfig | undefined> {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as AgentsKitConfig
  } catch {
    return undefined
  }
}

async function loadTsConfig(path: string): Promise<AgentsKitConfig | undefined> {
  try {
    const mod = await import(path)
    return (mod.default ?? mod) as AgentsKitConfig
  } catch {
    return undefined
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
  } catch {
    return undefined
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
  return {
    ...base,
    ...override,
    tools: { ...base.tools, ...override.tools },
    defaults: { ...base.defaults, ...override.defaults },
    runtime: { ...base.runtime, ...override.runtime },
    observability: { ...base.observability, ...override.observability },
  }
}

async function loadLocalConfig(cwd: string): Promise<AgentsKitConfig | undefined> {
  const tsConfig = await loadTsConfig(join(cwd, '.agentskit.config.ts'))
  if (tsConfig) return tsConfig

  const jsonConfig = await loadJsonConfig(join(cwd, '.agentskit.config.json'))
  if (jsonConfig) return jsonConfig

  return await loadPackageJsonConfig(cwd)
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
