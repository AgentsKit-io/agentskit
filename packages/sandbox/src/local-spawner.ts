// Default `Spawner` over node:child_process. Lazy-imports child_process so
// the module stays importable in non-node environments.

import { SandboxError } from '@agentskit/core'
import type { Spawner, SpawnerExecResult } from './local-sandbox-types'

/** Default cap on captured stdout+stderr (256 KiB). */
const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024

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
        const maxBytes = opts.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES
        const execArgs: import('node:child_process').SpawnOptionsWithoutStdio = { stdio: 'pipe' }
        if (opts.cwd !== undefined) execArgs.cwd = opts.cwd
        if (opts.env !== undefined) execArgs.env = opts.env
        const child = spawn(opts.command, [...opts.args], execArgs)
        let stdout = ''
        let stderr = ''
        let truncated = false
        let timedOut = false
        const append = (cur: string, chunk: Buffer): string => {
          if (cur.length >= maxBytes) {
            truncated = true
            return cur
          }
          const next = cur + chunk.toString('utf-8')
          if (next.length > maxBytes) {
            truncated = true
            return next.slice(0, maxBytes)
          }
          return next
        }
        child.stdout?.on('data', (c: Buffer) => {
          stdout = append(stdout, c)
        })
        child.stderr?.on('data', (c: Buffer) => {
          stderr = append(stderr, c)
        })
        const timer =
          opts.timeoutMs !== undefined
            ? setTimeout(() => {
                timedOut = true
                child.kill('SIGKILL')
              }, opts.timeoutMs)
            : undefined
        child.on('error', () => {
          if (timer) clearTimeout(timer)
          reject(
            new SandboxError({
              code: 'AK_SANDBOX_BACKEND_FAILED',
              message: `failed to exec child process: ${opts.command}`,
              hint: 'Check that the command exists on PATH and is executable.',
              cause: { command: opts.command, cwd: opts.cwd },
            }),
          )
        })
        child.on('close', (code) => {
          if (timer) clearTimeout(timer)
          resolve({ exitCode: code ?? -1, stdout, stderr, truncated, timedOut })
        })
      }),
  }
}
