// In-process (`none`), child-process (`process`), and macOS `sandbox-exec`
// runtimes. Each implements the `SandboxRuntime` adapter.

import { isAbsolute } from 'node:path'
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
  // Snapshot caller-provided env so later mutations cannot widen the allowlist.
  const frozenEnv = opts.defaultEnv ? filterEnv({ ...opts.defaultEnv }) : {}
  const defaultCwd = opts.defaultCwd
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  return {
    level: 'process',
    name: 'child-process',
    spawn: async (callOpts) => {
      const spawner = await spawnerPromise
      const spawnCwd = callOpts.cwd ?? defaultCwd
      const handle = await spawner.spawn({
        command: callOpts.command,
        args: [...callOpts.args],
        ...(spawnCwd !== undefined ? { cwd: spawnCwd } : {}),
        env: { ...frozenEnv },
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
      if (callOpts.timeoutMs !== undefined && (!Number.isFinite(callOpts.timeoutMs) || callOpts.timeoutMs <= 0)) {
        throw new SandboxError({
          code: 'AK_CONFIG_INVALID',
          message: `timeoutMs must be a finite number > 0 (received ${String(callOpts.timeoutMs)})`,
        })
      }
      if (
        callOpts.maxOutputBytes !== undefined &&
        (!Number.isFinite(callOpts.maxOutputBytes) || callOpts.maxOutputBytes <= 0)
      ) {
        throw new SandboxError({
          code: 'AK_CONFIG_INVALID',
          message: `maxOutputBytes must be a finite number > 0 (received ${String(callOpts.maxOutputBytes)})`,
        })
      }
      const cwd = callOpts.cwd ?? defaultCwd
      return runToCompletion({
        command: callOpts.command,
        args: [...callOpts.args],
        env: { ...frozenEnv },
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

const sbplString = (raw: string): string => JSON.stringify(raw)

/**
 * Minimal system paths required for process-exec of typical host binaries
 * (dyld, frameworks, shell tools). Intentionally narrow — not a global
 * `file-read*`.
 */
const SEATBELT_SYSTEM_READ_PATHS: readonly string[] = [
  '/usr',
  '/bin',
  '/sbin',
  '/System',
  '/Library',
  '/private/var/db/dyld',
  '/private/var/db',
  '/dev',
]

function assertAbsolutePath(path: string, label: string): void {
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    throw new SandboxError({
      code: 'AK_CONFIG_INVALID',
      message: `${label} must be an absolute path (received ${JSON.stringify(path)})`,
      hint: 'Pass an absolute filesystem path (e.g. "/Users/me/project").',
    })
  }
}

/**
 * Render a deterministic SBPL profile.
 *
 * Reads are limited to {@link SEATBELT_SYSTEM_READ_PATHS}, `workspaceRoot`,
 * and `extraReadablePaths`. There is **no** global `(allow file-read*)`.
 */
export const renderSandboxExecProfile = (policy: SandboxExecPolicy): string => {
  assertAbsolutePath(policy.workspaceRoot, 'workspaceRoot')
  const extra = policy.extraReadablePaths ? [...policy.extraReadablePaths] : []
  for (const p of extra) {
    assertAbsolutePath(p, 'extraReadablePaths entry')
  }

  const lines: string[] = [
    '(version 1)',
    '(deny default)',
    '(allow process-fork)',
    '(allow process-exec)',
    '(allow signal (target self))',
    '(allow file-read-metadata)',
    '(allow mach-lookup)',
    '(allow ipc-posix-shm)',
    '(allow sysctl-read)',
  ]

  // Deterministic order: system paths, then workspace, then extras.
  for (const p of SEATBELT_SYSTEM_READ_PATHS) {
    lines.push(`(allow file-read* (subpath ${sbplString(p)}))`)
  }
  lines.push(`(allow file-read* (subpath ${sbplString(policy.workspaceRoot)}))`)
  for (const path of extra) {
    lines.push(`(allow file-read* (subpath ${sbplString(path)}))`)
  }

  lines.push(`(allow file-write* (subpath ${sbplString(policy.workspaceRoot)}))`)
  lines.push('(allow file-write* (subpath "/private/tmp"))')
  lines.push('(allow file-write* (subpath "/private/var/folders"))')

  if (policy.allowNetwork === true) {
    lines.push('(allow network*)')
  } else {
    lines.push('(allow network-bind (local ip "*:*"))')
    lines.push('(deny network-outbound (with no-log))')
  }
  return lines.join('\n')
}

export const sandboxExecRuntime = (opts: SandboxExecRuntimeOpts): SandboxRuntime => {
  // Snapshot policy so caller mutations after create cannot widen the profile.
  const policy: SandboxExecPolicy = {
    workspaceRoot: opts.policy.workspaceRoot,
    allowNetwork: opts.policy.allowNetwork === true,
    extraReadablePaths: opts.policy.extraReadablePaths
      ? [...opts.policy.extraReadablePaths]
      : undefined,
  }
  const profile = renderSandboxExecProfile(policy)
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
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
