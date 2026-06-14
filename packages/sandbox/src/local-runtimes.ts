// In-process (`none`), child-process (`process`), and macOS `sandbox-exec`
// runtimes. Each implements the `SandboxRuntime` adapter.

import { SandboxError } from '@agentskit/core'
import { nodeSpawner } from './local-spawner'
import type { SandboxRuntime, Spawner } from './local-sandbox-types'

// --- none ---------------------------------------------------------------

export const noneSandbox: SandboxRuntime = {
  level: 'none',
  name: 'in-process',
  spawn: async () => {
    throw new SandboxError({
      code: 'AK_SANDBOX_DENIED',
      message:
        'noneSandbox.spawn rejected: "none" level is for in-process compute only; use process or higher to run external commands',
    })
  },
}

// --- process ------------------------------------------------------------

export type ProcessRuntimeOptions = {
  readonly spawner?: Spawner
  readonly defaultEnv?: Readonly<Record<string, string>>
  readonly defaultCwd?: string
}

const ALLOWED_ENV_KEYS = new Set(['PATH', 'HOME', 'TZ', 'LANG', 'LC_ALL', 'NODE_ENV'])

const filterEnv = (env: Readonly<Record<string, string>>): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(env)) {
    if (ALLOWED_ENV_KEYS.has(k) || k.startsWith('AGENTSKITOS_')) out[k] = v
  }
  return out
}

export const exposeAllowedEnvKeys = (): readonly string[] => [...ALLOWED_ENV_KEYS]

export const processSandbox = (opts: ProcessRuntimeOptions = {}): SandboxRuntime => {
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  return {
    level: 'process',
    name: 'child-process',
    spawn: async (callOpts) => {
      const spawner = await spawnerPromise
      const env = filterEnv(opts.defaultEnv ?? {})
      const spawnCwd = callOpts.cwd ?? opts.defaultCwd
      const handle = await spawner.spawn({
        command: callOpts.command,
        args: [...callOpts.args],
        ...(spawnCwd !== undefined ? { cwd: spawnCwd } : {}),
        env,
        stdio: 'pipe',
      })
      return { pid: handle.pid, kill: async () => handle.kill() }
    },
    exec: async (callOpts) => {
      const spawner = await spawnerPromise
      const runToCompletion = spawner.exec
      if (!runToCompletion) {
        throw new SandboxError({
          code: 'AK_SANDBOX_BACKEND_FAILED',
          message: 'process sandbox: the configured spawner does not support exec',
          hint: 'Inject a spawner with an `exec` method, or use the default `nodeSpawner`.',
        })
      }
      const env = filterEnv(opts.defaultEnv ?? {})
      const cwd = callOpts.cwd ?? opts.defaultCwd
      return runToCompletion({
        command: callOpts.command,
        args: [...callOpts.args],
        env,
        ...(cwd !== undefined ? { cwd } : {}),
        ...(callOpts.timeoutMs !== undefined ? { timeoutMs: callOpts.timeoutMs } : {}),
        ...(callOpts.maxOutputBytes !== undefined ? { maxOutputBytes: callOpts.maxOutputBytes } : {}),
      })
    },
  }
}

// --- sandbox-exec (macOS seatbelt) --------------------------------------

export type SandboxExecPolicy = {
  readonly workspaceRoot: string
  readonly allowNetwork?: boolean
  readonly extraReadablePaths?: readonly string[]
}

export type SandboxExecRuntimeOpts = {
  readonly policy: SandboxExecPolicy
  readonly spawner?: Spawner
  readonly sandboxExecPath?: string
}

const sbplString = (raw: string): string => `"${raw.replace(/"/g, '\\"')}"`

export const renderSandboxExecProfile = (policy: SandboxExecPolicy): string => {
  const lines: string[] = [
    '(version 1)',
    '(deny default)',
    '(allow process-fork)',
    '(allow process-exec)',
    '(allow signal (target self))',
    '(allow file-read*)',
    `(allow file-write* (subpath ${sbplString(policy.workspaceRoot)}))`,
    '(allow file-write* (subpath "/private/tmp"))',
    '(allow file-write* (subpath "/private/var/folders"))',
    '(allow mach-lookup)',
    '(allow ipc-posix-shm)',
    '(allow sysctl-read)',
  ]
  for (const path of policy.extraReadablePaths ?? []) {
    lines.push(`(allow file-read* (subpath ${sbplString(path)}))`)
  }
  if (policy.allowNetwork === true) {
    lines.push('(allow network*)')
  } else {
    lines.push('(allow network-bind (local ip "*:*"))')
    lines.push('(deny network-outbound (with no-log))')
  }
  return lines.join('\n')
}

export const sandboxExecRuntime = (opts: SandboxExecRuntimeOpts): SandboxRuntime => {
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  const profile = renderSandboxExecProfile(opts.policy)
  const sandboxExec = opts.sandboxExecPath ?? '/usr/bin/sandbox-exec'
  return {
    level: 'process',
    name: 'sandbox-exec',
    spawn: async (callOpts) => {
      if (process.platform !== 'darwin' && !opts.spawner) {
        throw new SandboxError({
          code: 'AK_SANDBOX_BACKEND_FAILED',
          message: 'sandbox-exec runtime requires darwin or an injected spawner',
        })
      }
      const spawner = await spawnerPromise
      const handle = await spawner.spawn({
        command: sandboxExec,
        args: ['-p', profile, callOpts.command, ...callOpts.args],
        ...(callOpts.cwd !== undefined ? { cwd: callOpts.cwd } : {}),
        stdio: 'pipe',
      })
      return { pid: handle.pid, kill: () => handle.kill() }
    },
  }
}
