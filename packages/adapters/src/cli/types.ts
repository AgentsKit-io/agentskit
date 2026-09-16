import type {
  AdapterCapabilities,
  AdapterRequest,
  StreamChunk,
  TokenUsage,
} from '@agentskit/core'

export type CliSecurityMode = 'review-safe' | 'trusted-local' | 'restricted-environment'
/**
 * Transport protocol of a CLI manifest. The protocol bounds what the adapter
 * can return:
 *
 * | Protocol    | Emits                                          | Never emits                                  |
 * | ----------- | ---------------------------------------------- | -------------------------------------------- |
 * | `exec-text` | streamed `text`                                | `tool_call`, `reasoning`, structured output, usage |
 * | `exec-json` | one parsed `text`/`reasoning`/`tool_call`/`usage` | streaming                                  |
 * | `acp`       | streamed `text`/`reasoning`                    | tool calls (rejected), MCP, plugins, terminal |
 *
 * `CliCapabilitiesFor<P>` encodes the same table at the type level so that a
 * manifest, or a `requiredCapabilities` request against it, cannot claim a
 * capability its protocol cannot deliver.
 */
export type CliProtocol = 'exec-text' | 'exec-json' | 'acp'

/** Capability keys each protocol can legitimately declare or be asked for. */
export interface CliProtocolCapabilityKeys {
  'exec-text': 'streaming' | 'nativeAuth'
  'exec-json': 'structuredOutput' | 'reasoning' | 'nativeAuth'
  acp: 'streaming' | 'structuredOutput' | 'reasoning' | 'nativeAuth'
}

/** The subset of `CliCapabilityRequirements` that protocol `P` supports. */
export type CliCapabilitiesFor<P extends CliProtocol> = Pick<CliCapabilityRequirements, CliProtocolCapabilityKeys[P]>
export type CliTerminationReason = 'aborted' | 'timeout' | 'output-limit'

export interface CliCapabilityRequirements {
  streaming?: boolean
  structuredOutput?: boolean
  reasoning?: boolean
  tools?: boolean
  mcp?: boolean
  plugins?: boolean
  terminal?: boolean
  nativeAuth?: boolean
}

export interface CliDiagnostic {
  available?: boolean
  success?: boolean
  providerId?: string
  command: string
  mode: CliSecurityMode
  protocol?: CliProtocol
  elapsedMs?: number
  exitCode?: number | null
  signal?: NodeJS.Signals | null
  termination?: CliTerminationReason
  version?: string
  error?: string
}

export interface CliProcessOptions {
  /** Executable path or an explicit executable name resolved by the OS. */
  command: string
  /** Arguments passed directly to the executable; never interpreted by a shell. */
  args?: readonly string[]
  /** Optional request-aware argv builder for CLIs whose prompt is an argument. */
  buildArgs?: (request: AdapterRequest) => readonly string[]
  /** Working directory exposed to the child process. */
  cwd?: string
  /** Safe by default; trusted-local may inherit the developer environment. The restricted mode is not an OS sandbox. */
  mode?: CliSecurityMode
  /** Explicit environment overlay. Values are redacted from diagnostics. */
  env?: Readonly<Record<string, string | undefined>>
  /** Hard deadline for the child process. Defaults to two minutes. */
  timeoutMs?: number
  /** Maximum stdout/stderr bytes accepted from one invocation. */
  maxOutputBytes?: number
  /** Grace period before forcefully terminating an aborted child. */
  killGraceMs?: number
  /** Stable consumer/provider label included in diagnostics only. */
  providerId?: string
  /** Protocol label included in diagnostics; set by a transport factory. */
  protocol?: CliProtocol
  /** Receives redacted lifecycle diagnostics; callback failures are ignored. */
  onDiagnostic?: (diagnostic: CliDiagnostic) => void
  /** Capabilities that must be available before spawning the executable. */
  requiredCapabilities?: CliCapabilityRequirements
}

export interface CliAdapterOptions extends CliProcessOptions {
  /** Defaults to a newline-terminated JSON representation of AdapterRequest. */
  serializeRequest?: (request: AdapterRequest) => string | Uint8Array
  /** Reads the bounded final response from a provider-managed output file. */
  outputFile?: string
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
  /** Decodes raw stdout before `parse`; useful for JSONL/event-wrapped CLIs. */
  parseOutput?: (stdout: string) => unknown
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
