import { CrossPlatformError, CrossPlatformErrorCodes } from '../errors'
import { spawnProcess, spawnShell } from './spawn'
import type { ChildHandle, ExitStatus, SpawnOptions, TerminationReason } from './types'

const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024

/** Spawn settings plus an output byte cap for command collection. */
export interface RunOptions extends Omit<SpawnOptions, 'stdout' | 'stderr'> {
  /** Stop collecting (and kill the process) past this many bytes per stream. Default 16 MiB. */
  maxOutputBytes?: number
}

/** Exit status, captured output, duration, and truncation or timeout state. */
export interface RunResult extends ExitStatus {
  stdout: string
  stderr: string
  durationMs: number
  /** True when output hit `maxOutputBytes` and was truncated. */
  truncated: boolean
  timedOut: boolean
}

async function collect(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  onOverflow: () => void,
): Promise<{ text: string; truncated: boolean }> {
  if (!stream) return { text: '', truncated: false }
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let text = ''
  let bytes = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (truncated) continue
    const room = maxBytes - bytes
    if (value.byteLength > room) {
      text += decoder.decode(value.subarray(0, room), { stream: true })
      truncated = true
      onOverflow()
      continue
    }
    bytes += value.byteLength
    text += decoder.decode(value, { stream: true })
  }
  return { text: text + decoder.decode(), truncated }
}

/**
 * Run a command to completion and collect its output as strings.
 * Rejects with CrossPlatformError when the command cannot start; a non-zero
 * exit code is a normal result, not an error.
 */
export async function runCommand(command: string, args: readonly string[] = [], options: RunOptions = {}): Promise<RunResult> {
  const maxBytes = maxOutputBytes(options)
  return collectRun(spawnProcess(command, args, { ...options, stdout: 'pipe', stderr: 'pipe' }), maxBytes)
}

/**
 * `runCommand` for a command line run through the platform shell (`sh -c` on
 * POSIX, `cmd.exe /d /s /c` on Windows). Only for command lines a user wrote
 * (hooks, scripts); see `spawnShell`.
 */
export async function runShell(commandLine: string, options: RunOptions = {}): Promise<RunResult> {
  const maxBytes = maxOutputBytes(options)
  return collectRun(spawnShell(commandLine, { ...options, stdout: 'pipe', stderr: 'pipe' }), maxBytes)
}

function maxOutputBytes(options: RunOptions): number {
  const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new CrossPlatformError({
      code: CrossPlatformErrorCodes.AK_PLATFORM_INVALID_INPUT,
      message: 'maxOutputBytes must be a positive integer',
    })
  }
  return maxBytes
}

async function collectRun(child: ChildHandle, maxBytes: number): Promise<RunResult> {
  const startedAt = Date.now()
  const overflow = () => void child.kill()
  const [status, stdout, stderr] = await Promise.all([
    child.exited,
    collect(child.stdout, maxBytes, overflow),
    collect(child.stderr, maxBytes, overflow),
  ])
  const termination: TerminationReason | undefined = status.termination
  return {
    ...status,
    stdout: stdout.text,
    stderr: stderr.text,
    durationMs: Date.now() - startedAt,
    truncated: stdout.truncated || stderr.truncated,
    timedOut: termination === 'timeout',
  }
}
