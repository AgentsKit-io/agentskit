import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { loadConfig } from './config'

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

export interface CheckResult {
  status: CheckStatus
  name: string
  detail?: string
  fix?: string
}

export interface DoctorReport {
  results: CheckResult[]
  pass: number
  warn: number
  fail: number
  skip: number
}

const PROVIDER_ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  grok: 'XAI_API_KEY',
  kimi: 'KIMI_API_KEY',
}

const PROVIDER_REACH_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/models',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  ollama: 'http://localhost:11434/api/tags',
}

// ============================================================================
// Individual checks
// ============================================================================

export async function checkNodeVersion(): Promise<CheckResult> {
  const major = Number(process.versions.node.split('.')[0])
  if (Number.isNaN(major)) {
    return { status: 'fail', name: 'Node version', detail: 'Could not parse process.versions.node' }
  }
  if (major < 22) {
    return {
      status: 'fail',
      name: 'Node version',
      detail: `Node ${process.versions.node} (need 22+)`,
      fix: 'Install Node 22 LTS or newer (https://nodejs.org)',
    }
  }
  if (major === 25) {
    return {
      status: 'warn',
      name: 'Node version',
      detail: `Node ${process.versions.node} — Docusaurus apps may break here`,
      fix: 'Use Node 22 LTS for the legacy docs app, or stay on 25 for everything else',
    }
  }
  return { status: 'pass', name: 'Node version', detail: `Node ${process.versions.node}` }
}

export async function checkPnpm(): Promise<CheckResult> {
  // We can't run binaries directly, but we can detect the lockfile signal
  const cwd = process.cwd()
  const hasPnpm = existsSync(join(cwd, 'pnpm-lock.yaml')) || existsSync(join(cwd, 'pnpm-workspace.yaml'))
  if (hasPnpm) {
    return { status: 'pass', name: 'Package manager', detail: 'pnpm detected (lockfile)' }
  }
  if (existsSync(join(cwd, 'package-lock.json'))) {
    return { status: 'warn', name: 'Package manager', detail: 'npm detected — pnpm recommended for monorepo workflows' }
  }
  if (existsSync(join(cwd, 'yarn.lock'))) {
    return { status: 'pass', name: 'Package manager', detail: 'yarn detected' }
  }
  if (existsSync(join(cwd, 'bun.lock')) || existsSync(join(cwd, 'bun.lockb'))) {
    return { status: 'pass', name: 'Package manager', detail: 'bun detected' }
  }
  return {
    status: 'skip',
    name: 'Package manager',
    detail: 'No lockfile found in cwd',
  }
}

export async function checkPackageJson(): Promise<CheckResult> {
  const path = join(process.cwd(), 'package.json')
  if (!existsSync(path)) {
    return {
      status: 'warn',
      name: 'package.json',
      detail: 'No package.json in cwd',
      fix: 'Run from a project directory (or use `agentskit init` to create one)',
    }
  }
  try {
    const pkg = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
    const deps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    }
    const akDeps = Object.entries(deps).filter(([name]) => name.startsWith('@agentskit/'))
    if (akDeps.length === 0) {
      return { status: 'skip', name: 'AgentsKit packages', detail: 'No @agentskit/* deps found in package.json' }
    }
    return {
      status: 'pass',
      name: 'AgentsKit packages',
      detail: `${akDeps.length} installed: ${akDeps.map(([n]) => n.replace('@agentskit/', '')).join(', ')}`,
    }
  } catch (err) {
    return {
      status: 'fail',
      name: 'package.json',
      detail: `Could not parse: ${(err as Error).message}`,
    }
  }
}

export async function checkProviderEnv(provider: string): Promise<CheckResult> {
  const envKey = PROVIDER_ENV_KEYS[provider]
  if (!envKey) {
    return { status: 'skip', name: `${provider} API key`, detail: 'No env-key requirement for this provider' }
  }
  const value = process.env[envKey]
  if (!value) {
    return {
      status: 'skip',
      name: `${provider} API key`,
      detail: `${envKey} not set`,
      fix: `export ${envKey}=... (only needed if you use ${provider})`,
    }
  }
  if (value.length < 16) {
    return {
      status: 'warn',
      name: `${provider} API key`,
      detail: `${envKey} looks too short (${value.length} chars)`,
      fix: 'Verify the key is complete and not truncated',
    }
  }
  return { status: 'pass', name: `${provider} API key`, detail: `${envKey} set (${value.length} chars)` }
}

export async function checkProviderReachable(
  provider: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 4000,
): Promise<CheckResult> {
  const url = PROVIDER_REACH_URLS[provider]
  if (!url) {
    return { status: 'skip', name: `${provider} reachable`, detail: 'No reachability check configured' }
  }

  // Skip reachability if no API key is set for keyed providers
  const envKey = PROVIDER_ENV_KEYS[provider]
  if (envKey && !process.env[envKey]) {
    return { status: 'skip', name: `${provider} reachable`, detail: 'Skipped — no API key configured' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
    })
    // 200-299 = healthy; 401/403 = reachable but auth issue (still pass);
    // 404+ = reachable but endpoint may have changed (warn)
    if (res.status >= 200 && res.status < 400) {
      return { status: 'pass', name: `${provider} reachable`, detail: `${url} → ${res.status} OK` }
    }
    if (res.status === 401 || res.status === 403 || res.status === 405) {
      return { status: 'pass', name: `${provider} reachable`, detail: `${url} → ${res.status} (host reachable)` }
    }
    return {
      status: 'warn',
      name: `${provider} reachable`,
      detail: `${url} → HTTP ${res.status}`,
      fix: 'Host reachable but returned unexpected status — check provider docs',
    }
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? `timeout after ${timeoutMs}ms` : (err as Error).message
    return {
      status: 'fail',
      name: `${provider} reachable`,
      detail: `${url} → ${reason}`,
      fix:
        provider === 'ollama'
          ? 'Start Ollama: `ollama serve` (or install from https://ollama.com)'
          : 'Check network / firewall / VPN settings',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function checkConfig(): Promise<CheckResult> {
  try {
    const config = await loadConfig()
    if (!config) {
      return { status: 'skip', name: 'AgentsKit config', detail: 'No .agentskit.config or package.json#agentskit found' }
    }
    return {
      status: 'pass',
      name: 'AgentsKit config',
      detail: `loaded — defaults: ${JSON.stringify(config.defaults ?? {})}`,
    }
  } catch (err) {
    return {
      status: 'warn',
      name: 'AgentsKit config',
      detail: `Could not load: ${(err as Error).message}`,
    }
  }
}

// ============================================================================
// Orchestration
// ============================================================================

export interface DoctorOptions {
  /** Provider names to check. Defaults to all known providers. */
  providers?: string[]
  /** Skip the network reachability checks. */
  noNetwork?: boolean
  /** Custom fetch (for tests). */
  fetchImpl?: typeof fetch
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const providers = options.providers ?? ['openai', 'anthropic', 'gemini', 'ollama']
  const fetchImpl = options.fetchImpl ?? fetch

  const checks: Array<Promise<CheckResult>> = [
    checkNodeVersion(),
    checkPnpm(),
    checkPackageJson(),
    checkConfig(),
  ]

  for (const provider of providers) {
    checks.push(checkProviderEnv(provider))
    if (!options.noNetwork) {
      checks.push(checkProviderReachable(provider, fetchImpl))
    }
  }

  const results = await Promise.all(checks)

  return {
    results,
    pass: results.filter(r => r.status === 'pass').length,
    warn: results.filter(r => r.status === 'warn').length,
    fail: results.filter(r => r.status === 'fail').length,
    skip: results.filter(r => r.status === 'skip').length,
  }
}

// ============================================================================
// Renderer (TTY-friendly)
// ============================================================================

const ICON: Record<CheckStatus, string> = {
  pass: '✔',
  warn: '⚠',
  fail: '✘',
  skip: '○',
}

export function renderReport(report: DoctorReport, opts: { color?: boolean } = {}): string {
  const color = opts.color ?? true
  const c = (code: string, text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text)
  const colorFor: Record<CheckStatus, (t: string) => string> = {
    pass: t => c('32', t),   // green
    warn: t => c('33', t),   // yellow
    fail: t => c('31', t),   // red
    skip: t => c('90', t),   // dim
  }

  const lines: string[] = []

  // Header
  lines.push('')
  lines.push(`  ${c('1;36', '⚡ AgentsKit Doctor')}`)
  lines.push(`  ${c('90', '─'.repeat(50))}`)
  lines.push('')

  // Group results by category
  const groups: Record<string, CheckResult[]> = {
    'Environment': [],
    'Providers': [],
    'Network': [],
  }
  for (const r of report.results) {
    if (r.name.includes('reachable')) {
      groups['Network'].push(r)
    } else if (r.name.includes('API key')) {
      groups['Providers'].push(r)
    } else {
      groups['Environment'].push(r)
    }
  }

  for (const [group, results] of Object.entries(groups)) {
    if (results.length === 0) continue
    lines.push(`  ${c('1', group)}`)
    for (const r of results) {
      const icon = colorFor[r.status](ICON[r.status])
      const name = r.name.padEnd(28)
      const detail = r.detail ? c('90', r.detail) : ''
      lines.push(`    ${icon}  ${name} ${detail}`)
      if (r.fix && r.status !== 'pass') {
        lines.push(`       ${c('90', '↳ ' + r.fix)}`)
      }
    }
    lines.push('')
  }

  // Summary bar
  lines.push(`  ${c('90', '─'.repeat(50))}`)
  const parts: string[] = []
  if (report.pass > 0) parts.push(colorFor.pass(`${report.pass} passed`))
  if (report.warn > 0) parts.push(colorFor.warn(`${report.warn} warnings`))
  if (report.fail > 0) parts.push(colorFor.fail(`${report.fail} failed`))
  if (report.skip > 0) parts.push(colorFor.skip(`${report.skip} skipped`))
  lines.push(`  ${parts.join('  ·  ')}`)

  // Verdict
  if (report.fail === 0) {
    lines.push(`  ${c('32', '✔ Ready to build agents.')}`)
  } else {
    lines.push(`  ${c('31', '✘ Fix the issues above before continuing.')}`)
  }
  lines.push('')
  return lines.join('\n')
}
