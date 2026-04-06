import { readFile } from 'node:fs/promises'
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
}

export async function loadConfig(options?: LoadConfigOptions): Promise<AgentsKitConfig | undefined> {
  const cwd = resolve(options?.cwd ?? process.cwd())

  // 1. Try .agentskit.config.ts
  const tsPath = join(cwd, '.agentskit.config.ts')
  const tsConfig = await loadTsConfig(tsPath)
  if (tsConfig) return tsConfig

  // 2. Try .agentskit.config.json
  const jsonPath = join(cwd, '.agentskit.config.json')
  const jsonConfig = await loadJsonConfig(jsonPath)
  if (jsonConfig) return jsonConfig

  // 3. Try package.json "agentskit" field
  return await loadPackageJsonConfig(cwd)
}
