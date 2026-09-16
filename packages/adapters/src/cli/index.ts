import { AdapterError, ErrorCodes, type AdapterFactory, type AdapterRequest, type AdapterCapabilities, type StreamChunk, type StreamSource } from '@agentskit/core'
import { adapterErrorChunk, isAbortError } from '../stream-errors'
import { abortableWrite, readCliOutputFile, readCliStdout, spawnCliProcess, writeCliInput } from './process'
import { cliError, isRecord, parseCliJsonResponse as standardJsonParser } from './json'
export { parseCliJsonResponse } from './json'
export { serializeCliPrompt } from './prompt'
export { parseClaudeCodeJsonOutput, parseClaudeCodeJsonResponse } from './claude-code'
export { diagnoseCliProviderManifest, getCliProviderManifest, listCliProviderManifests, manifestCapabilities, resolveCliManifest, validateCliProviderManifest } from './manifests'
import type {
  AcpCliAdapterOptions,
  CliCapabilityRequirements,
  CliAdapterOptions,
  CliJsonAdapterOptions,
  CliProtocol,
  CliProcessOptions,
} from './types'
export type { BuiltInCliManifestId, BuiltInCliManifestProtocols, CliManifestOptions, CliProviderManifest, CliProviderManifestFor } from './manifests'
export { diagnoseCliProvider } from './process'
export type {
  AcpCliAdapterOptions,
  AcpClientInfo,
  CliCapabilitiesFor,
  CliCapabilityRequirements,
  CliAdapterOptions,
  CliDiagnostic,
  CliJsonAdapterOptions,
  CliJsonParser,
  CliJsonResponse,
  CliProtocol,
  CliProtocolCapabilityKeys,
  CliProcessOptions,
  CliSecurityMode,
  CliTerminationReason,
  CliToolCall,
} from './types'

const defaultSerialize = (request: AdapterRequest): string => `${JSON.stringify(request)}\n`
function createFactory(
  capabilities: AdapterCapabilities,
  run: (request: AdapterRequest, signal: AbortSignal) => AsyncIterableIterator<StreamChunk>,
): AdapterFactory {
  return {
    capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      const controller = new AbortController()
      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (controller.signal.aborted) return
          try {
            yield* run(request, controller.signal)
          } catch (error) {
            if (isAbortError(error) || controller.signal.aborted) return
            yield adapterErrorChunk(error instanceof Error ? error.message : String(error), { cause: error })
          }
        },
        abort: () => controller.abort(),
      }
    },
  }
}
function mergeCapabilities(base: AdapterCapabilities, override?: AdapterCapabilities): AdapterCapabilities {
  return {
    ...base,
    ...override,
    extensions: { ...base.extensions, ...override?.extensions },
  }
}
function capabilityError(capability: string, protocol: CliProtocol): AdapterError {
  return new AdapterError({
    code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message: `CLI protocol ${protocol} does not support required capability: ${capability}`,
    hint: 'Use a provider manifest with a compatible protocol or remove the unsupported requirement.',
  })
}

function preflightCli(options: CliProcessOptions, protocol: CliProtocol): void {
  const required: CliCapabilityRequirements = options.requiredCapabilities ?? {}
  const supported: Record<string, boolean> = {
    streaming: protocol !== 'exec-json',
    structuredOutput: protocol !== 'exec-text',
    reasoning: protocol !== 'exec-text',
    tools: false,
    mcp: false,
    plugins: false,
    terminal: false,
    nativeAuth: (options.mode ?? 'review-safe') === 'trusted-local',
  }
  for (const [capability, requested] of Object.entries(required)) {
    if (requested === true && supported[capability] !== true) throw capabilityError(capability, protocol)
  }
}

async function closeProcess(handle: ReturnType<typeof spawnCliProcess>): Promise<void> {
  handle.terminate()
  await handle.completion.catch(() => undefined)
}

async function* runText(
  request: AdapterRequest,
  signal: AbortSignal,
  options: CliAdapterOptions,
): AsyncIterableIterator<StreamChunk> {
  preflightCli(options, 'exec-text')
  const handle = spawnCliProcess({ ...options, args: options.buildArgs?.(request) ?? options.args, protocol: 'exec-text' }, signal)
  const decoder = new TextDecoder()
  let emitted = false
  try {
    writeCliInput(handle, (options.serializeRequest ?? defaultSerialize)(request))
    for await (const bytes of readCliStdout(handle, signal, options.maxOutputBytes)) {
      const text = decoder.decode(bytes, { stream: true })
      if (text) {
        emitted = true
        yield { type: 'text', content: text }
      }
    }
    const trailing = decoder.decode()
    if (trailing) {
      emitted = true
      yield { type: 'text', content: trailing }
    }
    if (options.outputFile) {
      const output = await readCliOutputFile(options.outputFile, signal, options.maxOutputBytes ?? 8 * 1024 * 1024)
      if (!output) throw cliError('CLI output file was empty')
      yield { type: 'text', content: output }
    } else if (!emitted) throw cliError('CLI returned an empty text response')
    yield { type: 'done' }
  } finally {
    await closeProcess(handle)
  }
}

function normalizeJsonChunks(chunks: readonly StreamChunk[]): StreamChunk[] {
  if (chunks.length === 0) throw cliError('CLI JSON parser returned no chunks')
  if (chunks.some(chunk => !isStreamChunk(chunk))) throw cliError('CLI JSON parser returned an invalid stream chunk')
  const terminalIndexes = chunks.flatMap((chunk, index) => chunk.type === 'done' || chunk.type === 'error' ? [index] : [])
  if (terminalIndexes.length > 1 || (terminalIndexes.length === 1 && terminalIndexes[0] !== chunks.length - 1)) {
    throw cliError('CLI JSON parser returned an invalid terminal sequence')
  }
  const last = chunks[chunks.length - 1]
  return last.type === 'done' || last.type === 'error' ? [...chunks] : [...chunks, { type: 'done' }]
}

function isStreamChunk(value: unknown): value is StreamChunk {
  return isRecord(value) && typeof value.type === 'string' && new Set([
    'text', 'tool_call', 'tool_result', 'reasoning', 'usage', 'error', 'done',
  ]).has(value.type)
}

async function* runJson(
  request: AdapterRequest,
  signal: AbortSignal,
  options: CliJsonAdapterOptions,
): AsyncIterableIterator<StreamChunk> {
  preflightCli(options, 'exec-json')
  const handle = spawnCliProcess({ ...options, args: options.buildArgs?.(request) ?? options.args, protocol: 'exec-json' }, signal)
  const decoder = new TextDecoder()
  let output = ''
  try {
    writeCliInput(handle, (options.serializeRequest ?? defaultSerialize)(request))
    for await (const bytes of readCliStdout(handle, signal, options.maxOutputBytes)) output += decoder.decode(bytes, { stream: true })
    output += decoder.decode()
    let value: unknown
    try {
      value = (options.parseOutput ?? JSON.parse)(output)
    } catch (error) {
      throw cliError(`CLI returned malformed JSON: ${error instanceof Error ? error.message : String(error)}`, error)
    }
    const chunks = normalizeJsonChunks((options.parse ?? standardJsonParser)(value))
    for (const chunk of chunks) yield chunk
  } finally {
    await closeProcess(handle)
  }
}

interface AcpResponse {
  kind: 'response'
  id: string | number | null
  result?: unknown
  error?: { code?: number; message?: string }
}

interface AcpNotification {
  kind: 'notification'
  method: string
  params?: unknown
}

interface AcpRequest {
  kind: 'request'
  method: string
}

type AcpMessage = AcpResponse | AcpNotification | AcpRequest

function parseAcpMessage(value: unknown): AcpMessage {
  if (!isRecord(value) || value.jsonrpc !== '2.0') throw cliError('ACP message must be a JSON-RPC 2.0 object')
  if (typeof value.method === 'string') {
    if (value.id === undefined) return { kind: 'notification', method: value.method, params: value.params }
    return { kind: 'request', method: value.method }
  }
  if (typeof value.id === 'string' || typeof value.id === 'number' || value.id === null) {
    if (value.error !== undefined && !isRecord(value.error)) throw cliError('ACP error response is malformed')
    return { kind: 'response', id: value.id, result: value.result, error: value.error as AcpResponse['error'] }
  }
  throw cliError('ACP message has no method or response id')
}

async function* readAcpMessages(handle: ReturnType<typeof spawnCliProcess>, signal: AbortSignal, maxOutputBytes: number): AsyncIterableIterator<AcpMessage> {
  const decoder = new TextDecoder()
  let buffer = ''
  let bytesRead = 0
  for await (const chunk of handle.child.stdout as AsyncIterable<Buffer>) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    bytesRead += chunk.byteLength
    if (bytesRead > maxOutputBytes) {
      handle.terminate('output-limit')
      throw cliError('ACP output exceeded the configured limit')
    }
    buffer += decoder.decode(chunk, { stream: true })
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (line) yield parseAcpMessage(JSON.parse(line) as unknown)
      newline = buffer.indexOf('\n')
    }
  }
  buffer += decoder.decode()
  if (buffer.trim()) yield parseAcpMessage(JSON.parse(buffer.trim()) as unknown)
}

function acpRequest(id: string, method: string, params: Record<string, unknown>): string {
  return `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`
}

async function nextAcpResponse(
  iterator: AsyncIterator<AcpMessage>,
  id: string,
): Promise<AcpResponse> {
  while (true) {
    const next = await iterator.next()
    if (next.done) throw cliError(`ACP process closed before response ${id}`)
    if (next.value.kind === 'response' && next.value.id === id) {
      if (next.value.error) throw cliError(`ACP request failed: ${next.value.error.message ?? 'unknown error'}`)
      return next.value
    }
    if (next.value.kind === 'request') throw cliError(`ACP agent request is unsupported in this adapter: ${next.value.method}`)
  }
}

function promptText(request: AdapterRequest, options: AcpCliAdapterOptions): string {
  if (options.toPrompt) return options.toPrompt(request)
  const system = request.context?.systemPrompt ? `[system]\n${request.context.systemPrompt}\n\n` : ''
  return system + request.messages.map(message => `[${message.role}]\n${message.content}`).join('\n\n')
}

function acpUpdateChunk(params: unknown, sessionId: string): StreamChunk | undefined {
  if (!isRecord(params) || params.sessionId !== sessionId || !isRecord(params.update)) return undefined
  const update = params.update
  if (update.sessionUpdate === 'agent_message_chunk' && isRecord(update.content) && update.content.type === 'text' && typeof update.content.text === 'string') {
    return { type: 'text', content: update.content.text }
  }
  if (update.sessionUpdate === 'agent_thought_chunk' && isRecord(update.content) && update.content.type === 'text' && typeof update.content.text === 'string') {
    return { type: 'reasoning', content: update.content.text }
  }
  if (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update') {
    throw cliError('ACP tool calls require an explicit client tool policy and are unsupported in this transport')
  }
  return undefined
}

async function* runAcp(
  request: AdapterRequest,
  signal: AbortSignal,
  options: AcpCliAdapterOptions,
): AsyncIterableIterator<StreamChunk> {
  if ((options.protocolVersion ?? 1) !== 1) throw cliError('Only ACP protocol version 1 is supported')
  preflightCli(options, 'acp')
  const handle = spawnCliProcess({ ...options, args: options.buildArgs?.(request) ?? options.args, protocol: 'acp' }, signal)
  const iterator = readAcpMessages(handle, signal, options.maxOutputBytes ?? 8 * 1024 * 1024)[Symbol.asyncIterator]()
  let sequence = 0
  const nextId = (): string => `agentskit-${++sequence}`
  try {
    const initializeId = nextId()
    await abortableWrite(handle, acpRequest(initializeId, 'initialize', {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false, auth: { terminal: false } },
      clientInfo: options.clientInfo ?? { name: '@agentskit/adapters', version: '0.16.0' },
    }), signal)
    const initialize = await nextAcpResponse(iterator, initializeId)
    if (!isRecord(initialize.result) || initialize.result.protocolVersion !== 1) throw cliError('ACP agent did not negotiate protocol version 1')

    const sessionIdRequest = nextId()
    await abortableWrite(handle, acpRequest(sessionIdRequest, 'session/new', {
      cwd: options.cwd ?? process.cwd(),
      mcpServers: [],
    }), signal)
    const sessionResponse = await nextAcpResponse(iterator, sessionIdRequest)
    if (!isRecord(sessionResponse.result) || typeof sessionResponse.result.sessionId !== 'string') throw cliError('ACP session/new response has no sessionId')
    const sessionId = sessionResponse.result.sessionId

    const promptId = nextId()
    await abortableWrite(handle, acpRequest(promptId, 'session/prompt', {
      sessionId,
      prompt: [{ type: 'text', text: promptText(request, options) }],
    }), signal)
    let emitted = false
    while (true) {
      const next = await iterator.next()
      if (next.done) throw cliError('ACP process closed before session/prompt completed')
      if (next.value.kind === 'response' && next.value.id === promptId) {
        if (next.value.error) throw cliError(`ACP prompt failed: ${next.value.error.message ?? 'unknown error'}`)
        if (!isRecord(next.value.result) || next.value.result.stopReason !== 'end_turn') throw cliError('ACP prompt did not complete with end_turn')
        break
      }
      if (next.value.kind === 'request') throw cliError(`ACP agent request is unsupported in this adapter: ${next.value.method}`)
      if (next.value.kind === 'notification' && next.value.method === 'session/update') {
        const chunk = acpUpdateChunk(next.value.params, sessionId)
        if (chunk) {
          emitted = true
          yield chunk
        }
      }
    }
    if (!emitted) throw cliError('ACP prompt completed without semantic output')
    yield { type: 'done' }
  } finally {
    handle.terminate()
    await handle.completion.catch(() => undefined)
  }
}

export function createCliAdapter(options: CliAdapterOptions): AdapterFactory {
  return createFactory(mergeCapabilities({
    streaming: true,
    tools: false,
    structuredOutput: false,
    extensions: { cli: { protocol: 'exec-text', mode: options.mode ?? 'review-safe' } },
  }, options.capabilities), (request, signal) => runText(request, signal, options))
}

export function createJsonCliAdapter(options: CliJsonAdapterOptions): AdapterFactory {
  return createFactory(mergeCapabilities({
    streaming: false,
    tools: false,
    structuredOutput: true,
    extensions: { cli: { protocol: 'exec-json', mode: options.mode ?? 'review-safe' } },
  }, options.capabilities), (request, signal) => runJson(request, signal, options))
}

export function createAcpCliAdapter(options: AcpCliAdapterOptions): AdapterFactory {
  return createFactory({
    streaming: true,
    tools: false,
    reasoning: true,
    structuredOutput: true,
    extensions: { cli: { protocol: 'acp', protocolVersion: options.protocolVersion ?? 1, mode: options.mode ?? 'review-safe' } },
  }, (request, signal) => runAcp(request, signal, options))
}

