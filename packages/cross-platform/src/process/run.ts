import { CrossPlatformError, CrossPlatformErrorCodes } from '../errors'
import { spawnProcess } from './spawn'
import type { ExitStatus, SpawnOptions, TerminationReason } from './types'

const DEFAULT_MAX_OUTPUT_BYTES = 16 * 1024 * 1024

export interface RunOptions extends Omit<SpawnOptions, 'stdout' | 'stderr'> {
  /** Stop collecting (and kill the process) past this many bytes per stream. Default 16 MiB. */
  maxOutputBytes?: number
}

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
  const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new CrossPlatformError({
      code: CrossPlatformErrorCodes.AK_PLATFORM_INVALID_INPUT,
      message: 'maxOutputBytes must be a positive integer',
    })
  }
  const startedAt = Date.now()
  const child = spawnProcess(command, args, { ...options, stdout: 'pipe', stderr: 'pipe' })
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
