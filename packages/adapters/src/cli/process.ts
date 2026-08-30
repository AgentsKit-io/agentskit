import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { AdapterError, ErrorCodes } from '@agentskit/core'
import { raceAbort } from '../stream-errors'
import type { CliDiagnostic, CliProcessOptions, CliTerminationReason } from './types'

const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024
const DEFAULT_KILL_GRACE_MS = 250

type TerminationReason = CliTerminationReason

export interface CliProcessResult {
  code: number | null
  signal: NodeJS.Signals | null
  stderr: string
  elapsedMs: number
  termination?: TerminationReason
}

export interface CliProcessHandle {
  child: ChildProcessWithoutNullStreams
  completion: Promise<CliProcessResult>
  terminate: (reason?: TerminationReason) => void
}

function validateOptions(options: CliProcessOptions): void {
  if (options.mode !== undefined && !['review-safe', 'trusted-local', 'isolated'].includes(options.mode)) {
    throw new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'CLI mode must be review-safe, trusted-local, or isolated',
    })
  }
  if (!options.command.trim()) throw new AdapterError({
    code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message: 'CLI command must not be empty',
  })
  if (options.command.includes('\0') || options.args?.some(arg => arg.includes('\0'))) {
    throw new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'CLI command and arguments must not contain null bytes',
    })
  }
  for (const [name, value] of Object.entries(options.env ?? {})) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || value?.includes('\0')) {
      throw new AdapterError({
        code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
        message: `Invalid CLI environment variable: ${name}`,
      })
    }
  }
  if (options.timeoutMs !== undefined && (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1)) {
    throw new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'CLI timeoutMs must be a positive integer',
    })
  }
  if (options.maxOutputBytes !== undefined && (!Number.isInteger(options.maxOutputBytes) || options.maxOutputBytes < 1)) {
    throw new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'CLI maxOutputBytes must be a positive integer',
    })
  }
  if (options.killGraceMs !== undefined && (!Number.isInteger(options.killGraceMs) || options.killGraceMs < 0)) {
    throw new AdapterError({
      code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
      message: 'CLI killGraceMs must be a non-negative integer',
    })
  }
}

function redactionValues(options: CliProcessOptions): string[] {
  const values = new Set<string>()
  for (const [name, value] of Object.entries(options.env ?? {})) {
    if (value && value.length >= 4) values.add(value)
    if (options.mode === 'trusted-local' && /(?:key|token|secret|password|credential|auth)/i.test(name)) {
      const inherited = process.env[name]
      if (inherited && inherited.length >= 4) values.add(inherited)
    }
  }
  if (options.mode === 'trusted-local') {
    for (const [name, value] of Object.entries(process.env)) {
      if (value && value.length >= 4 && /(?:key|token|secret|password|credential|auth)/i.test(name)) values.add(value)
    }
  }
  return [...values].sort((left, right) => right.length - left.length)
}

export function redactCliText(text: string, values: readonly string[] = []): string {
  let redacted = text
  for (const value of values) redacted = redacted.split(value).join('[REDACTED]')
  return redacted
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:sk|pk|xai|ghp|github_pat|AIza)[A-Za-z0-9_-]{10,}\b/g, '[REDACTED]')
}

function emitDiagnostic(options: CliProcessOptions, diagnostic: CliDiagnostic): void {
  try {
    options.onDiagnostic?.(diagnostic)
  } catch {
    // Observability must never change process or adapter behavior.
  }
}

function buildEnvironment(options: CliProcessOptions): NodeJS.ProcessEnv {
  const mode = options.mode ?? 'review-safe'
  let inherited: NodeJS.ProcessEnv
  if (mode === 'trusted-local') {
    inherited = { ...process.env }
  } else {
    const entries: Array<[string, string]> = []
    for (const name of ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'TMP', 'TEMP', 'TMPDIR']) {
      const value = process.env[name]
      if (value !== undefined) entries.push([name, value])
    }
    inherited = Object.fromEntries(entries)
  }
  return { ...inherited, ...options.env }
}

export function spawnCliProcess(options: CliProcessOptions, signal?: AbortSignal): CliProcessHandle {
  validateOptions(options)
  const startedAt = Date.now()
  const redactions = redactionValues(options)
  const child = spawn(options.command, [...(options.args ?? [])], {
    cwd: options.cwd ?? process.cwd(),
    env: buildEnvironment(options),
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  const killGraceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS
  const stderrDecoder = new TextDecoder()
  let stderr = ''
  let stderrBytes = 0
  let termination: TerminationReason | undefined
  let terminated = false
  let forceTimer: ReturnType<typeof setTimeout> | undefined
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined

  const terminate = (reason?: TerminationReason): void => {
    if (reason) termination = reason
    if (terminated || child.exitCode !== null) return
    terminated = true
    try {
      child.kill('SIGTERM')
    } catch {
      try { child.kill() } catch { /* process may already be gone */ }
    }
    forceTimer = setTimeout(() => {
      if (child.exitCode !== null) return
      try {
        child.kill('SIGKILL')
      } catch {
        try { child.kill() } catch { /* process may already be gone */ }
      }
    }, killGraceMs)
  }

  child.stderr.on('data', (chunk: Buffer) => {
    stderrBytes += chunk.byteLength
    if (stderrBytes > maxOutputBytes) {
      terminate('output-limit')
      return
    }
    stderr += stderrDecoder.decode(chunk, { stream: true })
  })

  const completion = new Promise<CliProcessResult>((resolve, reject) => {
    let settled = false
    const cleanup = (): void => {
      if (timeoutTimer) clearTimeout(timeoutTimer)
      if (forceTimer) clearTimeout(forceTimer)
      signal?.removeEventListener('abort', onAbort)
      stderr += stderrDecoder.decode()
    }
    const onAbort = (): void => terminate('aborted')
    const onError = (error: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      const message = redactCliText(error.message, redactions)
      emitDiagnostic(options, {
        providerId: options.providerId,
        command: options.command,
        mode: options.mode ?? 'review-safe',
        protocol: options.protocol,
        elapsedMs: Date.now() - startedAt,
        termination,
        success: false,
        error: message,
      })
      reject(processError('CLI process failed', message, error))
    }
    child.once('error', onError)
    child.stdin.once('error', onError)
    child.once('close', (code, childSignal) => {
      if (settled) return
      settled = true
      cleanup()
      const elapsedMs = Date.now() - startedAt
      const safeStderr = redactCliText(stderr, redactions)
      const success = code === 0 && termination === undefined
      emitDiagnostic(options, {
        providerId: options.providerId,
        command: options.command,
        mode: options.mode ?? 'review-safe',
        protocol: options.protocol,
        elapsedMs,
        exitCode: code,
        signal: childSignal,
        termination,
        success,
        error: success ? undefined : safeStderr.trim() || undefined,
      })
      resolve({ code, signal: childSignal, stderr: safeStderr, elapsedMs, termination })
    })
    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort, { once: true })
    timeoutTimer = setTimeout(() => terminate('timeout'), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  })

  return { child, completion, terminate }
}

export function writeCliInput(handle: CliProcessHandle, input?: string | Uint8Array): void {
  if (input === undefined) {
    handle.child.stdin.end()
    return
  }
  handle.child.stdin.end(typeof input === 'string' ? input : Buffer.from(input))
}

function processError(message: string, stderr: string, cause?: unknown): AdapterError {
  const suffix = stderr.trim() ? `: ${stderr.trim().slice(0, 1000)}` : ''
  return new AdapterError({
    code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message: `${message}${suffix}`,
    cause,
  })
}

export async function* readCliStdout(
  handle: CliProcessHandle,
  signal: AbortSignal,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
): AsyncIterableIterator<Uint8Array> {
  let outputBytes = 0
  try {
    for await (const chunk of handle.child.stdout as AsyncIterable<Buffer>) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      outputBytes += chunk.byteLength
      if (outputBytes > maxOutputBytes) {
        handle.terminate('output-limit')
        throw processError('CLI output exceeded the configured limit', '')
      }
      yield new Uint8Array(chunk)
    }
    const result = await handle.completion
    if (result.termination === 'aborted' || signal.aborted) throw new DOMException('Aborted', 'AbortError')
    if (result.termination === 'timeout') throw processError('CLI process timed out', result.stderr)
    if (result.termination === 'output-limit') throw processError('CLI output exceeded the configured limit', result.stderr)
    if (result.code !== 0) throw processError(`CLI process exited with code ${String(result.code)}`, result.stderr)
  } finally {
    handle.terminate()
    await handle.completion.catch(() => undefined)
  }
}

export async function diagnoseCliProvider(
  options: CliProcessOptions & { diagnosticArgs?: readonly string[] },
): Promise<CliDiagnostic> {
  const mode = options.mode ?? 'review-safe'
  const handle = spawnCliProcess({ ...options, protocol: options.protocol ?? 'exec-text', args: options.diagnosticArgs ?? ['--version'], timeoutMs: options.timeoutMs ?? 5_000, maxOutputBytes: options.maxOutputBytes ?? 64 * 1024 })
  try {
    const decoder = new TextDecoder()
    let output = ''
    writeCliInput(handle)
    for await (const chunk of handle.child.stdout as AsyncIterable<Buffer>) output += decoder.decode(chunk, { stream: true })
    output += decoder.decode()
    const result = await handle.completion
    if (result.code !== 0 || result.termination) return {
      available: false,
      providerId: options.providerId,
      command: options.command,
      mode,
      protocol: options.protocol ?? 'exec-text',
      elapsedMs: result.elapsedMs,
      exitCode: result.code,
      signal: result.signal,
      termination: result.termination,
      error: result.stderr.trim() || `CLI exited with code ${String(result.code)}`,
    }
    return { available: true, providerId: options.providerId, command: options.command, mode, protocol: options.protocol ?? 'exec-text', elapsedMs: result.elapsedMs, exitCode: result.code, signal: result.signal, version: output.trim() || undefined }
  } catch (error) {
    return {
      available: false,
      providerId: options.providerId,
      command: options.command,
      mode,
      protocol: options.protocol ?? 'exec-text',
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    handle.terminate()
  }
}

export async function abortableWrite(
  handle: CliProcessHandle,
  input: string,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  if (handle.child.stdin.write(input)) return
  let onDrain: (() => void) | undefined
  let onError: ((error: Error) => void) | undefined
  const waitForDrain = new Promise<void>((resolve, reject) => {
    onDrain = (): void => {
      handle.child.stdin.removeListener('error', onError!)
      resolve()
    }
    onError = (error: Error): void => {
      handle.child.stdin.removeListener('drain', onDrain!)
      reject(error)
    }
    handle.child.stdin.once('drain', onDrain)
    handle.child.stdin.once('error', onError)
  })
  try {
    await raceAbort(waitForDrain, signal)
  } finally {
    if (onDrain) handle.child.stdin.removeListener('drain', onDrain)
    if (onError) handle.child.stdin.removeListener('error', onError)
  }
}

export { DEFAULT_MAX_OUTPUT_BYTES }
