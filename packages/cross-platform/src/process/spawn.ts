import {
  CrossPlatformError,
  CrossPlatformErrorCodes,
  isNotFoundError,
  isPermissionError,
  mapRuntimeError,
  permissionDenied,
} from '../errors'
import { getRuntimeInfo, type RuntimeName } from '../runtime'
import { createBunAdapter, type BunRuntime } from './bun-adapter'
import { createDenoAdapter, type DenoRuntime } from './deno-adapter'
import { killProcessTree } from './kill'
import { nodeAdapter } from './node-adapter'
import { resolveCommand, shellCommand, type ResolvedCommand } from './resolve'
import type { AdapterChild, ChildHandle, ExitStatus, RuntimeAdapter, SpawnOptions, TerminationReason } from './types'

const DEFAULT_KILL_GRACE_MS = 2_000

/** Pick the native adapter for the current runtime (Bun.spawn, Deno.Command, or node:child_process). */
export function selectAdapter(runtime: RuntimeName = getRuntimeInfo().runtime): RuntimeAdapter {
  const globals = globalThis as { Bun?: BunRuntime; Deno?: DenoRuntime }
  if (runtime === 'bun' && globals.Bun) return createBunAdapter(globals.Bun)
  if (runtime === 'deno' && globals.Deno) return createDenoAdapter(globals.Deno)
  if (runtime === 'node' || runtime === 'bun' || runtime === 'deno') return nodeAdapter
  throw new CrossPlatformError({
    code: CrossPlatformErrorCodes.AK_PLATFORM_UNSUPPORTED_RUNTIME,
    message: `Cannot spawn processes in the "${runtime}" runtime`,
    hint: 'Process APIs need Node, Bun or Deno. Use @agentskit/cross-platform/pure in browsers and edge workers.',
  })
}

function invalid(message: string): CrossPlatformError {
  return new CrossPlatformError({ code: CrossPlatformErrorCodes.AK_PLATFORM_INVALID_INPUT, message })
}

function validate(command: string, args: readonly string[], options: SpawnOptions): void {
  if (!command.trim()) throw invalid('Command must not be empty')
  if (command.includes('\0') || args.some(arg => arg.includes('\0'))) throw invalid('Command and arguments must not contain null bytes')
  if (options.timeoutMs !== undefined && (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1)) {
    throw invalid('timeoutMs must be a positive integer')
  }
  if (options.killGraceMs !== undefined && (!Number.isInteger(options.killGraceMs) || options.killGraceMs < 0)) {
    throw invalid('killGraceMs must be a non-negative integer')
  }
  if (options.input !== undefined && options.stdin !== undefined && options.stdin !== 'pipe') {
    throw invalid('input requires stdin to be "pipe"')
  }
}

function toSpawnError(error: unknown, command: string): unknown {
  if (error instanceof CrossPlatformError) return error
  if (isPermissionError(error)) return permissionDenied('run', command, error)
  if (isNotFoundError(error)) return notFound(command, error)
  return new CrossPlatformError({
    code: CrossPlatformErrorCodes.AK_PLATFORM_SPAWN_FAILED,
    message: `Failed to start "${command}"`,
    cause: error,
  })
}

function notFound(command: string, cause?: unknown): CrossPlatformError {
  return new CrossPlatformError({
    code: CrossPlatformErrorCodes.AK_PLATFORM_COMMAND_NOT_FOUND,
    message: `Command not found: ${command}`,
    hint: 'Install it or add its directory to PATH. On Windows, npm-installed tools are .cmd shims; they are resolved automatically.',
    cause,
  })
}

function envRecord(env: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) if (value !== undefined) result[key] = value
  return result
}

function failedHandle(error: unknown): ChildHandle {
  const exited = Promise.reject(error)
  exited.catch(() => {})
  return { pid: undefined, stdin: null, stdout: null, stderr: null, exited, kill: async () => {} }
}

async function writeInput(stdin: WritableStream<Uint8Array> | null, input: string | Uint8Array): Promise<void> {
  if (!stdin) return
  const writer = stdin.getWriter()
  try {
    await writer.write(typeof input === 'string' ? new TextEncoder().encode(input) : input)
    await writer.close()
  } catch {
    // The child exited or closed stdin early (EPIPE); its exit status tells the story.
  }
}

/**
 * Start a process the same way on every OS and runtime:
 * - `.cmd`/`.bat` shims (npx, pnpm, claude…) resolve on Windows without `shell: true`;
 * - `input` goes through stdin, so prompts are never truncated by argv limits or newlines;
 * - timeout and abort kill the whole process tree, not only the wrapper;
 * - stdout/stderr are web `ReadableStream`s on Node, Bun and Deno.
 *
 * Never throws for a failed start: `exited` rejects with a CrossPlatformError.
 * Invalid options throw synchronously.
 */
export function spawnProcess(command: string, args: readonly string[] = [], options: SpawnOptions = {}): ChildHandle {
  validate(command, args, options)
  return startProcess(command, options, env => resolveCommand(command, args, { cwd: options.cwd, env }))
}

/**
 * Run a command line through the platform shell: `sh -c` on POSIX,
 * `cmd.exe /d /s /c` on Windows. Only for command lines a user configured
 * explicitly (hooks, scripts). Everything else should use `spawnProcess`,
 * which never involves a shell. Same handle, timeout and tree-kill semantics.
 */
export function spawnShell(commandLine: string, options: SpawnOptions = {}): ChildHandle {
  validate(commandLine, [], options)
  return startProcess(commandLine, options, env => shellCommand(commandLine, env))
}

function startProcess(
  command: string,
  options: SpawnOptions,
  resolve: (env: Record<string, string>) => ResolvedCommand,
): ChildHandle {
  const stdinMode = options.input !== undefined ? 'pipe' : (options.stdin ?? 'pipe')
  let env: Record<string, string>
  try {
    env = envRecord(options.env ?? process.env)
  } catch (error) {
    return failedHandle(mapRuntimeError(error, 'env', 'process.env'))
  }
  let child: AdapterChild
  try {
    const resolved = resolve(env)
    if (!resolved.found) return failedHandle(notFound(command))
    child = selectAdapter()({
      command: resolved.command,
      args: resolved.args,
      cwd: options.cwd,
      env,
      stdin: stdinMode,
      stdout: options.stdout ?? 'pipe',
      stderr: options.stderr ?? 'pipe',
      windowsHide: options.windowsHide ?? true,
      windowsVerbatimArguments: resolved.windowsVerbatimArguments,
    })
  } catch (error) {
    return failedHandle(toSpawnError(error, command))
  }

  let termination: TerminationReason | undefined
  let forceTimer: ReturnType<typeof setTimeout> | undefined
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined
  let exitedFlag = false

  const killTree = (signal: NodeJS.Signals): Promise<void> => {
    if (exitedFlag) return Promise.resolve()
    if (child.pid === undefined) {
      try {
        child.kill(signal)
      } catch {
        // Already gone.
      }
      return Promise.resolve()
    }
    return killProcessTree(child.pid, signal, sig => child.kill(sig))
  }

  const terminate = (reason: TerminationReason, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> => {
    termination ??= reason
    if (forceTimer === undefined && signal !== 'SIGKILL') {
      forceTimer = setTimeout(() => void killTree('SIGKILL'), options.killGraceMs ?? DEFAULT_KILL_GRACE_MS)
    }
    return killTree(signal)
  }

  const onAbort = () => void terminate('aborted')
  if (options.signal?.aborted) onAbort()
  else options.signal?.addEventListener('abort', onAbort, { once: true })
  if (options.timeoutMs !== undefined) timeoutTimer = setTimeout(() => void terminate('timeout'), options.timeoutMs)

  const exited: Promise<ExitStatus> = child.exited.then(
    status => (termination ? { ...status, termination } : status),
    error => {
      throw toSpawnError(error, command)
    },
  )
  const settle = () => {
    exitedFlag = true
    clearTimeout(timeoutTimer)
    clearTimeout(forceTimer)
    options.signal?.removeEventListener('abort', onAbort)
  }
  exited.then(settle, settle)
  exited.catch(() => {})

  if (options.input !== undefined) void writeInput(child.stdin, options.input)

  return {
    pid: child.pid,
    stdin: options.input !== undefined ? null : child.stdin,
    stdout: child.stdout,
    stderr: child.stderr,
    exited,
    kill: signal => terminate('killed', signal),
  }
}
