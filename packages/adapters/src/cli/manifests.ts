import { AdapterError, ErrorCodes, type AdapterCapabilities } from '@agentskit/core'
import { diagnoseCliProvider } from './process'
import type {
  CliAdapterOptions,
  CliCapabilityRequirements,
  CliDiagnostic,
  CliProcessOptions,
  CliProtocol,
  CliSecurityMode,
} from './types'

export interface CliProviderManifest {
  id: string
  name: string
  command: string
  args: readonly string[]
  diagnosticArgs: readonly string[]
  protocol: CliProtocol
  protocolVersion?: 1
  capabilities: CliCapabilityRequirements
  supportedModes: readonly CliSecurityMode[]
  credentialEnv?: readonly string[]
  docsUrl?: string
  versionPattern?: string
}

export interface CliManifestOptions {
  args?: readonly string[]
  mode?: CliSecurityMode
  cwd?: string
  env?: Readonly<Record<string, string | undefined>>
  timeoutMs?: number
  maxOutputBytes?: number
  killGraceMs?: number
  onDiagnostic?: CliProcessOptions['onDiagnostic']
  requiredCapabilities?: CliCapabilityRequirements
}

const MODES: readonly CliSecurityMode[] = ['review-safe', 'trusted-local', 'isolated']
const CAPABILITIES = new Set<keyof CliCapabilityRequirements>([
  'streaming', 'structuredOutput', 'reasoning', 'tools', 'mcp', 'plugins', 'terminal', 'nativeAuth',
])

const manifests: readonly CliProviderManifest[] = [
  {
    id: 'codex',
    name: 'OpenAI Codex CLI',
    command: 'codex',
    args: ['exec'],
    diagnosticArgs: ['--version'],
    protocol: 'exec-text',
    capabilities: { streaming: true, nativeAuth: true },
    supportedModes: MODES,
    credentialEnv: ['OPENAI_API_KEY', 'CODEX_API_KEY'],
    docsUrl: 'https://github.com/openai/codex',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    command: 'claude',
    args: ['-p'],
    diagnosticArgs: ['--version'],
    protocol: 'exec-text',
    capabilities: { streaming: true, nativeAuth: true },
    supportedModes: MODES,
    credentialEnv: ['ANTHROPIC_API_KEY'],
    docsUrl: 'https://docs.anthropic.com/en/docs/claude-code/cli-usage',
  },
  {
    id: 'grok',
    name: 'Grok CLI',
    command: 'grok',
    args: ['agent', 'stdio'],
    diagnosticArgs: ['version'],
    protocol: 'acp',
    protocolVersion: 1,
    capabilities: { streaming: true, structuredOutput: true, reasoning: true, nativeAuth: true },
    supportedModes: MODES,
    credentialEnv: ['XAI_API_KEY'],
    docsUrl: 'https://docs.x.ai/build/cli/headless-scripting',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    args: ['acp'],
    diagnosticArgs: ['--version'],
    protocol: 'acp',
    protocolVersion: 1,
    capabilities: { streaming: true, structuredOutput: true, reasoning: true },
    supportedModes: MODES,
    docsUrl: 'https://opencode.ai/docs/cli/',
  },
]

function manifestError(message: string): AdapterError {
  return new AdapterError({
    code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message,
    hint: 'Declare an explicit CLI manifest with a supported protocol, mode, and capability set.',
  })
}

function nonEmpty(value: string, label: string): void {
  if (!value.trim() || value.includes('\0')) throw manifestError(`CLI manifest ${label} must be a non-empty string without null bytes`)
}

function validateArgs(values: readonly string[], label: string): void {
  for (const value of values) {
    if (value.includes('\0')) throw manifestError(`CLI manifest ${label} contains a null byte`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateCapabilities(manifest: CliProviderManifest): void {
  for (const capability of Object.keys(manifest.capabilities) as Array<keyof CliCapabilityRequirements>) {
    if (!CAPABILITIES.has(capability)) throw manifestError(`CLI manifest declares unknown capability: ${capability}`)
    if (manifest.capabilities[capability] !== true) throw manifestError(`CLI manifest capability ${capability} must be true or omitted`)
  }
  const unsupportedByProtocol: Record<CliProtocol, readonly (keyof CliCapabilityRequirements)[]> = {
    'exec-text': ['structuredOutput', 'reasoning', 'tools', 'mcp', 'plugins', 'terminal'],
    'exec-json': ['streaming', 'tools', 'mcp', 'plugins', 'terminal'],
    acp: ['tools', 'mcp', 'plugins', 'terminal'],
  }
  for (const capability of unsupportedByProtocol[manifest.protocol]) {
    if (manifest.capabilities[capability] === true) throw manifestError(`CLI manifest ${manifest.id} declares unsupported ${capability} for ${manifest.protocol}`)
  }
}

export function validateCliProviderManifest(manifest: unknown): asserts manifest is CliProviderManifest {
  if (!isRecord(manifest)) throw manifestError('CLI manifest must be an object')
  if (typeof manifest.id !== 'string' || typeof manifest.name !== 'string' || typeof manifest.command !== 'string') {
    throw manifestError('CLI manifest id, name, and command must be strings')
  }
  if (!Array.isArray(manifest.args) || !manifest.args.every(value => typeof value === 'string') || !Array.isArray(manifest.diagnosticArgs) || !manifest.diagnosticArgs.every(value => typeof value === 'string')) {
    throw manifestError('CLI manifest args and diagnosticArgs must be string arrays')
  }
  if (manifest.protocol !== 'exec-text' && manifest.protocol !== 'exec-json' && manifest.protocol !== 'acp') {
    throw manifestError('CLI manifest protocol is unsupported')
  }
  if (!isRecord(manifest.capabilities) || !Array.isArray(manifest.supportedModes)) throw manifestError('CLI manifest capabilities and supportedModes are required')
  if (!manifest.supportedModes.every(value => typeof value === 'string')) throw manifestError('CLI manifest supportedModes must be a string array')
  const candidate = manifest as unknown as CliProviderManifest
  nonEmpty(candidate.id, 'id')
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(candidate.id)) throw manifestError(`CLI manifest id is invalid: ${candidate.id}`)
  nonEmpty(candidate.name, 'name')
  nonEmpty(candidate.command, 'command')
  validateArgs(candidate.args, 'args')
  validateArgs(candidate.diagnosticArgs, 'diagnosticArgs')
  if (candidate.protocolVersion !== undefined && candidate.protocolVersion !== 1) throw manifestError(`CLI manifest ${candidate.id} uses an unsupported protocol version`)
  if (candidate.supportedModes.length === 0 || !candidate.supportedModes.includes('review-safe')) throw manifestError(`CLI manifest ${candidate.id} must support review-safe mode`)
  for (const mode of candidate.supportedModes) {
    if (!MODES.includes(mode)) throw manifestError(`CLI manifest ${manifest.id} declares an unknown mode: ${mode}`)
  }
  if (candidate.credentialEnv !== undefined && (!Array.isArray(candidate.credentialEnv) || !candidate.credentialEnv.every(value => typeof value === 'string'))) throw manifestError(`CLI manifest ${candidate.id} credentialEnv must be a string array`)
  for (const name of candidate.credentialEnv ?? []) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw manifestError(`CLI manifest ${candidate.id} declares an invalid credential environment variable`)
  }
  if (candidate.versionPattern !== undefined) {
    if (typeof candidate.versionPattern !== 'string') throw manifestError(`CLI manifest ${candidate.id} versionPattern must be a string`)
    try { new RegExp(candidate.versionPattern) } catch (error) { throw manifestError(`CLI manifest ${candidate.id} has an invalid version pattern: ${String(error)}`) }
  }
  if (candidate.docsUrl !== undefined && typeof candidate.docsUrl !== 'string') throw manifestError(`CLI manifest ${candidate.id} docsUrl must be a string`)
  validateCapabilities(candidate)
}

export function listCliProviderManifests(): CliProviderManifest[] {
  return manifests.map(manifest => ({
    ...manifest,
    args: [...manifest.args],
    diagnosticArgs: [...manifest.diagnosticArgs],
    capabilities: { ...manifest.capabilities },
    supportedModes: [...manifest.supportedModes],
    credentialEnv: manifest.credentialEnv ? [...manifest.credentialEnv] : undefined,
  }))
}

export function getCliProviderManifest(id: string): CliProviderManifest | undefined {
  return listCliProviderManifests().find(manifest => manifest.id === id)
}

export function resolveCliManifest(manifest: CliProviderManifest, options: CliManifestOptions = {}): CliAdapterOptions {
  validateCliProviderManifest(manifest)
  const mode = options.mode ?? 'review-safe'
  if (!manifest.supportedModes.includes(mode)) throw manifestError(`CLI manifest ${manifest.id} does not support mode: ${mode}`)
  return {
    command: manifest.command,
    args: [...manifest.args, ...(options.args ?? [])],
    mode,
    cwd: options.cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
    maxOutputBytes: options.maxOutputBytes,
    killGraceMs: options.killGraceMs,
    providerId: manifest.id,
    protocol: manifest.protocol,
    onDiagnostic: options.onDiagnostic,
    requiredCapabilities: options.requiredCapabilities,
  }
}

function adapterCapabilities(manifest: CliProviderManifest): AdapterCapabilities {
  const { streaming, structuredOutput, reasoning, tools } = manifest.capabilities
  return { streaming, structuredOutput, reasoning, tools, extensions: { cli: { provider: manifest.id, protocol: manifest.protocol } } }
}

export async function diagnoseCliProviderManifest(
  manifest: CliProviderManifest,
  options: Omit<CliManifestOptions, 'args'> = {},
): Promise<CliDiagnostic> {
  validateCliProviderManifest(manifest)
  const diagnostic = await diagnoseCliProvider({
    ...resolveCliManifest(manifest, options),
    diagnosticArgs: manifest.diagnosticArgs,
  })
  if (diagnostic.available && manifest.versionPattern && !new RegExp(manifest.versionPattern).test(diagnostic.version ?? '')) {
    return { ...diagnostic, available: false, error: `CLI version does not match manifest ${manifest.id}` }
  }
  return diagnostic
}

export function manifestCapabilities(manifest: CliProviderManifest): AdapterCapabilities {
  validateCliProviderManifest(manifest)
  return adapterCapabilities(manifest)
}
