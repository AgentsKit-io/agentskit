// Linux bubblewrap (`bwrap`) and Docker runtimes — kernel-namespace
// isolation. Both shell out to the host binary via the injected `Spawner`,
// staying free of native deps.

import { existsSync } from 'node:fs'
import { SandboxError } from '@agentskit/core'
import { nodeSpawner } from './local-spawner'
import type { SandboxRuntime, Spawner } from './local-sandbox-types'

// --- bwrap --------------------------------------------------------------

export type BwrapPolicy = {
  readonly workspaceRoot: string
  readonly allowNetwork?: boolean
  readonly readOnlyPaths?: readonly string[]
  readonly readWritePaths?: readonly string[]
}

export type BwrapRuntimeOpts = {
  readonly policy: BwrapPolicy
  readonly spawner?: Spawner
  readonly bwrapPath?: string
}

const STANDARD_RO = ['/usr', '/bin', '/sbin', '/lib', '/lib64', '/etc']

export const isBwrapSupported = (): boolean => process.platform === 'linux'

export const getBwrapPath = (): string | null => {
  if (!isBwrapSupported()) return null
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(':')) {
    if (!dir) continue
    const candidate = `${dir}/bwrap`
    if (existsSync(candidate)) return candidate
  }
  return null
}

export const renderBwrapArgs = (policy: BwrapPolicy): readonly string[] => {
  const args: string[] = []
  for (const p of STANDARD_RO) args.push('--ro-bind-try', p, p)
  for (const p of policy.readOnlyPaths ?? []) args.push('--ro-bind', p, p)
  args.push('--bind', policy.workspaceRoot, policy.workspaceRoot)
  for (const p of policy.readWritePaths ?? []) args.push('--bind', p, p)
  args.push('--proc', '/proc')
  args.push('--dev', '/dev')
  args.push('--tmpfs', '/tmp')
  args.push('--unshare-all')
  if (policy.allowNetwork === true) args.push('--share-net')
  args.push('--die-with-parent')
  args.push('--new-session')
  return args
}

export const bwrapRuntime = (opts: BwrapRuntimeOpts): SandboxRuntime => {
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  const bwrap = opts.bwrapPath ?? 'bwrap'
  const baseArgs = renderBwrapArgs(opts.policy)
  return {
    level: 'process',
    name: 'bwrap',
    spawn: async (callOpts) => {
      if (process.platform !== 'linux' && !opts.spawner) {
        throw new SandboxError({
          code: 'AK_SANDBOX_BACKEND_FAILED',
          message: 'bwrap runtime requires linux or an injected spawner',
        })
      }
      const spawner = await spawnerPromise
      const handle = await spawner.spawn({
        command: bwrap,
        args: [...baseArgs, '--', callOpts.command, ...callOpts.args],
        ...(callOpts.cwd !== undefined ? { cwd: callOpts.cwd } : {}),
        stdio: 'pipe',
      })
      return { pid: handle.pid, kill: () => handle.kill() }
    },
  }
}

// --- docker -------------------------------------------------------------

export type DockerPolicy = {
  readonly image: string
  readonly workspaceRoot: string
  readonly mountTarget?: string
  /** `--network` flag. Defaults to `none`; set to `bridge`/a named network for egress. */
  readonly network?: string
  readonly writableWorkspace?: boolean
  readonly extraArgs?: readonly string[]
  readonly user?: string
  readonly capabilities?: readonly string[]
}

export type DockerRuntimeOpts = {
  readonly policy: DockerPolicy
  readonly spawner?: Spawner
  readonly dockerPath?: string
}

const DEFAULT_MOUNT_TARGET = '/workspace'

const hostUserSpec = (override: string | undefined): string | undefined => {
  if (override !== undefined) return override
  if (typeof process.getuid === 'function' && typeof process.getgid === 'function') {
    return `${process.getuid()}:${process.getgid()}`
  }
  return undefined
}

export const renderDockerArgs = (policy: DockerPolicy): readonly string[] => {
  const target = policy.mountTarget ?? DEFAULT_MOUNT_TARGET
  const args: string[] = ['run', '--rm', '--init']
  args.push('--network', policy.network ?? 'none')
  args.push('--cap-drop', 'ALL')
  for (const cap of policy.capabilities ?? []) args.push('--cap-add', cap)
  args.push('--security-opt', 'no-new-privileges')
  args.push('--read-only')
  args.push('--tmpfs', '/tmp:rw,size=64m')
  const user = hostUserSpec(policy.user)
  if (user !== undefined) args.push('--user', user)
  const mountSpec =
    policy.writableWorkspace === true
      ? `${policy.workspaceRoot}:${target}:rw`
      : `${policy.workspaceRoot}:${target}:ro`
  args.push('-v', mountSpec)
  args.push('-w', target)
  for (const a of policy.extraArgs ?? []) args.push(a)
  args.push(policy.image)
  return args
}

export const dockerRuntime = (opts: DockerRuntimeOpts): SandboxRuntime => {
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  const docker = opts.dockerPath ?? 'docker'
  const baseArgs = renderDockerArgs(opts.policy)
  return {
    level: 'container',
    name: 'docker',
    spawn: async (callOpts) => {
      const spawner = await spawnerPromise
      const handle = await spawner.spawn({
        command: docker,
        args: [...baseArgs, callOpts.command, ...callOpts.args],
        ...(callOpts.cwd !== undefined ? { cwd: callOpts.cwd } : {}),
        stdio: 'pipe',
      })
      return { pid: handle.pid, kill: () => handle.kill() }
    },
    exec: async (callOpts) => {
      const spawner = await spawnerPromise
      const runToCompletion = spawner.exec
      if (!runToCompletion) {
        throw new SandboxError({
          code: 'AK_SANDBOX_BACKEND_FAILED',
          message: 'docker sandbox: the configured spawner does not support exec',
          hint: 'Inject a spawner with an `exec` method, or use the default `nodeSpawner`.',
        })
      }
      const execOpts: Parameters<typeof runToCompletion>[0] = {
        command: docker,
        args: [...baseArgs, callOpts.command, ...callOpts.args],
      }
      if (callOpts.cwd !== undefined) execOpts.cwd = callOpts.cwd
      if (callOpts.timeoutMs !== undefined) execOpts.timeoutMs = callOpts.timeoutMs
      if (callOpts.maxOutputBytes !== undefined) execOpts.maxOutputBytes = callOpts.maxOutputBytes
      return runToCompletion(execOpts)
    },
  }
}
