import type {
  AdapterCapabilities,
  AdapterRequest,
  StreamChunk,
  TokenUsage,
} from '@agentskit/core'

export type CliSecurityMode = 'review-safe' | 'trusted-local' | 'isolated'

export interface CliProcessOptions {
  /** Executable path or an explicit executable name resolved by the OS. */
  command: string
  /** Arguments passed directly to the executable; never interpreted by a shell. */
  args?: readonly string[]
  /** Working directory exposed to the child process. */
  cwd?: string
  /** Safe by default; trusted-local may inherit the developer environment. */
  mode?: CliSecurityMode
  /** Explicit environment overlay. Values are redacted from diagnostics. */
  env?: Readonly<Record<string, string | undefined>>
  /** Hard deadline for the child process. Defaults to two minutes. */
  timeoutMs?: number
  /** Maximum stdout/stderr bytes accepted from one invocation. */
  maxOutputBytes?: number
  /** Grace period before forcefully terminating an aborted child. */
  killGraceMs?: number
}

export interface CliAdapterOptions extends CliProcessOptions {
  /** Defaults to a newline-terminated JSON representation of AdapterRequest. */
  serializeRequest?: (request: AdapterRequest) => string | Uint8Array
  /** Optional capability extensions merged into the transport defaults. */
  capabilities?: AdapterCapabilities
}

export interface CliToolCall {
  id: string
  name: string
  args: string
}

export interface CliJsonResponse {
  text?: string
  reasoning?: string
  toolCalls?: readonly CliToolCall[]
  usage?: TokenUsage
  metadata?: Record<string, unknown>
}

export type CliJsonParser = (value: unknown) => readonly StreamChunk[]

export interface CliJsonAdapterOptions extends CliAdapterOptions {
  /** Maps one schema-validated JSON response to normalized stream chunks. */
  parse?: CliJsonParser
}

export interface AcpClientInfo {
  name: string
  version: string
}

export interface AcpCliAdapterOptions extends CliProcessOptions {
  protocolVersion?: 1
  clientInfo?: AcpClientInfo
  /** Maps the full AgentsKit request to the ACP user text block. */
  toPrompt?: (request: AdapterRequest) => string
}

export interface CliDiagnostic {
  available: boolean
  command: string
  mode: CliSecurityMode
  version?: string
  error?: string
}

