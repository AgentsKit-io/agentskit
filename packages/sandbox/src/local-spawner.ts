// Default `Spawner` over node:child_process. Lazy-imports child_process so
// the module stays importable in non-node environments.

import { SandboxError } from '@agentskit/core'
import type { Spawner, SpawnerExecResult } from './local-sandbox-types'

/** Default cap on captured stdout+stderr **bytes** (256 KiB). */
const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new SandboxError({
      code: 'AK_CONFIG_INVALID',
      message: `${name} must be a finite number > 0 (received ${String(value)})`,
      hint: `Pass a positive ${name}.`,
    })
  }
}

/**
 * Default {@link Spawner} over `node:child_process`.
 *
 * Output caps apply to the **combined** stdout + stderr size in **UTF-8 bytes**
 * (not character length, not per-stream).
 */
export const nodeSpawner = async (): Promise<Spawner> => {
  const { spawn } = await import('node:child_process')
  return {
    spawn: async (opts) => {
      const spawnArgs: import('node:child_process').SpawnOptions = { stdio: opts.stdio ?? 'pipe' }
      if (opts.cwd !== undefined) spawnArgs.cwd = opts.cwd
      if (opts.env !== undefined) spawnArgs.env = opts.env
      const child = spawn(opts.command, [...opts.args], spawnArgs)
      const pid = child.pid
      if (typeof pid !== 'number') {
        child.kill()
        throw new SandboxError({
          code: 'AK_SANDBOX_BACKEND_FAILED',
          message: `failed to spawn child process: ${opts.command}`,
          hint: 'Check that the command exists on PATH, the working directory is valid, and the sandbox has permission to execute it.',
          cause: { command: opts.command, cwd: opts.cwd },
        })
      }
      return {
        pid,
        kill: async () => {
          if (!child.killed) child.kill()
        },
      }
    },
    exec: (opts) =>
      new Promise<SpawnerExecResult>((resolve, reject) => {
        if (opts.timeoutMs !== undefined) {
          assertPositiveFinite('timeoutMs', opts.timeoutMs)
        }
        if (opts.maxOutputBytes !== undefined) {
          assertPositiveFinite('maxOutputBytes', opts.maxOutputBytes)
        }
        const maxBytes = opts.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
        const execArgs: import('node:child_process').SpawnOptionsWithoutStdio = { stdio: 'pipe' }
        if (opts.cwd !== undefined) execArgs.cwd = opts.cwd
        if (opts.env !== undefined) execArgs.env = opts.env
        const child = spawn(opts.command, [...opts.args], execArgs)
        const stdoutChunks: Buffer[] = []
        const stderrChunks: Buffer[] = []
        let totalBytes = 0
        let truncated = false
        let timedOut = false
        let settled = false

        const append = (stream: 'stdout' | 'stderr', chunk: Buffer): void => {
          if (totalBytes >= maxBytes) {
            truncated = true
            return
          }
          const remaining = maxBytes - totalBytes
          const accepted = chunk.length <= remaining ? chunk : chunk.subarray(0, remaining)
          if (stream === 'stdout') stdoutChunks.push(accepted)
          else stderrChunks.push(accepted)
          totalBytes += accepted.length
          if (accepted.length < chunk.length) truncated = true
        }

        child.stdout?.on('data', (c: Buffer) => {
          append('stdout', c)
        })
        child.stderr?.on('data', (c: Buffer) => {
          append('stderr', c)
        })
        const timer =
          opts.timeoutMs !== undefined
            ? setTimeout(() => {
                timedOut = true
                child.kill('SIGKILL')
              }, opts.timeoutMs)
            : undefined
        child.on('error', (err) => {
          if (settled) return
          settled = true
          if (timer) clearTimeout(timer)
          reject(
            new SandboxError({
              code: 'AK_SANDBOX_BACKEND_FAILED',
              message: `failed to exec child process: ${opts.command}`,
              hint: 'Check that the command exists on PATH and is executable.',
              cause: err,
            }),
          )
        })
        child.on('close', (code) => {
          if (settled) return
          settled = true
          if (timer) clearTimeout(timer)
          const decodePrefix = (chunks: Buffer[]): string => {
            const raw = Buffer.concat(chunks)
            let end = raw.length
            while (end > 0) {
              try {
                return new TextDecoder('utf-8', { fatal: true }).decode(raw.subarray(0, end))
              } catch {
                end -= 1
                truncated = true
              }
            }
            return ''
          }
          resolve({
            exitCode: code ?? -1,
            stdout: decodePrefix(stdoutChunks),
            stderr: decodePrefix(stderrChunks),
            truncated,
            timedOut,
          })
        })
      }),
  }
}
