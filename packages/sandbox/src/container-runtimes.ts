// Linux bubblewrap (`bwrap`) and Docker runtimes — kernel-namespace
// isolation. Both shell out to the host binary via the injected `Spawner`,
// staying free of native deps.
//
// **bwrap level note:** `bwrapRuntime.level` remains `'process'` for
// compatibility with existing registry consumers. Kernel unshare isolation is
// stronger than a plain child process, but remapping to `'container'` is a
// breaking change deferred to a future RFC — do not treat level as a full
// security rating; use `assertStrongIsolation` / documentation instead.

import { existsSync } from 'node:fs'
import { isAbsolute } from 'node:path'
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

function assertAbsolutePath(path: string, label: string): void {
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    throw new SandboxError({
      code: 'AK_CONFIG_INVALID',
      message: `${label} must be an absolute path (received ${JSON.stringify(path)})`,
      hint: 'Pass an absolute filesystem path.',
    })
  }
}

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
  assertAbsolutePath(policy.workspaceRoot, 'workspaceRoot')
  const ro = policy.readOnlyPaths ? [...policy.readOnlyPaths] : []
  const rw = policy.readWritePaths ? [...policy.readWritePaths] : []
  for (const p of ro) assertAbsolutePath(p, 'readOnlyPaths entry')
  for (const p of rw) assertAbsolutePath(p, 'readWritePaths entry')

  const args: string[] = []
  for (const p of STANDARD_RO) args.push('--ro-bind-try', p, p)
  for (const p of ro) args.push('--ro-bind', p, p)
  args.push('--bind', policy.workspaceRoot, policy.workspaceRoot)
  for (const p of rw) args.push('--bind', p, p)
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
  const policy: BwrapPolicy = {
    workspaceRoot: opts.policy.workspaceRoot,
    allowNetwork: opts.policy.allowNetwork === true,
    readOnlyPaths: opts.policy.readOnlyPaths ? [...opts.policy.readOnlyPaths] : undefined,
    readWritePaths: opts.policy.readWritePaths ? [...opts.policy.readWritePaths] : undefined,
  }
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  const bwrap = opts.bwrapPath ?? 'bwrap'
  const baseArgs = renderBwrapArgs(policy)
  return {
    // Kept as 'process' for registry compatibility — see file header.
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
  /**
   * Extra `docker run` args. Dangerous escapes (`--privileged`, host
   * pid/ipc/network, extra mounts/devices, security-opt that weakens
   * no-new-privileges, etc.) are rejected.
   */
  readonly extraArgs?: readonly string[]
  readonly user?: string
  /**
   * Capabilities to re-add after `--cap-drop ALL`. Dangerous capabilities
   * (`ALL`, `SYS_ADMIN`, `SYS_MODULE`, …) are rejected.
   */
  readonly capabilities?: readonly string[]
}

export type DockerRuntimeOpts = {
  readonly policy: DockerPolicy
  readonly spawner?: Spawner
  readonly dockerPath?: string
}

const DEFAULT_MOUNT_TARGET = '/workspace'

/**
 * Capabilities that obviously undo cap-drop hardening. Narrow opt-ins such as
 * NET_BIND_SERVICE remain allowed; existing NET_ADMIN test opt-ins stay valid.
 */
const DANGEROUS_CAPABILITIES = new Set([
  'ALL',
  'SYS_ADMIN',
  'SYS_MODULE',
  'SYS_PTRACE',
  'SYS_RAWIO',
  'SYS_BOOT',
  'SYS_TIME',
  'MAC_ADMIN',
  'MAC_OVERRIDE',
])

const hostUserSpec = (override: string | undefined): string | undefined => {
  if (override !== undefined) return override
  if (typeof process.getuid === 'function' && typeof process.getgid === 'function') {
    return `${process.getuid()}:${process.getgid()}`
  }
  return undefined
}

function rejectDockerEscape(arg: string, detail: string): never {
  throw new SandboxError({
    code: 'AK_CONFIG_INVALID',
    message: `docker policy rejected unsafe arg ${JSON.stringify(arg)}: ${detail}`,
    hint: 'Remove privileged/host-namespace/mount/device escapes from extraArgs and capabilities. Use the typed policy fields for workspace mounts and network.',
  })
}

/**
 * Reject obvious container escapes in `extraArgs`. Safe resource limits
 * (`--memory`, `--cpus`, `--ulimit`, …) remain allowed.
 */
export const assertSafeDockerExtraArgs = (extraArgs: readonly string[]): void => {
  for (let i = 0; i < extraArgs.length; i++) {
    const raw = extraArgs[i]!
    const arg = raw.trim()
    const lower = arg.toLowerCase()

    if (lower === '--privileged' || lower.startsWith('--privileged=')) {
      rejectDockerEscape(arg, '--privileged is not allowed')
    }
    if (lower === '--pid' || lower.startsWith('--pid=')) {
      const val = lower.startsWith('--pid=') ? lower.slice('--pid='.length) : (extraArgs[i + 1] ?? '').toLowerCase()
      if (val === 'host') rejectDockerEscape(arg, 'host PID namespace is not allowed')
    }
    if (lower === '--ipc' || lower.startsWith('--ipc=')) {
      const val = lower.startsWith('--ipc=') ? lower.slice('--ipc='.length) : (extraArgs[i + 1] ?? '').toLowerCase()
      if (val === 'host') rejectDockerEscape(arg, 'host IPC namespace is not allowed')
    }
    if (lower === '--network' || lower === '--net' || lower.startsWith('--network=') || lower.startsWith('--net=')) {
      rejectDockerEscape(arg, 'network must be configured through policy.network')
    }
    if (lower === '--userns' || lower.startsWith('--userns=')) {
      const val = lower.startsWith('--userns=') ? lower.slice('--userns='.length) : (extraArgs[i + 1] ?? '').toLowerCase()
      if (val === 'host') rejectDockerEscape(arg, 'host user namespace is not allowed')
    }
    if (lower === '--cgroupns' || lower.startsWith('--cgroupns=')) {
      const val = lower.startsWith('--cgroupns=')
        ? lower.slice('--cgroupns='.length)
        : (extraArgs[i + 1] ?? '').toLowerCase()
      if (val === 'host') rejectDockerEscape(arg, 'host cgroup namespace is not allowed')
    }
    if (lower === '-v' || lower === '--volume' || lower.startsWith('--volume=') || lower.startsWith('-v=')) {
      rejectDockerEscape(arg, 'extra volume mounts must use policy.workspaceRoot / mountTarget')
    }
    if (lower === '--mount' || lower.startsWith('--mount=')) {
      rejectDockerEscape(arg, 'extra --mount is not allowed; use policy.workspaceRoot')
    }
    if (lower === '--device' || lower.startsWith('--device=')) {
      rejectDockerEscape(arg, 'host device passthrough is not allowed')
    }
    if (lower === '--security-opt' || lower.startsWith('--security-opt=')) {
      const val = lower.startsWith('--security-opt=')
        ? lower.slice('--security-opt='.length)
        : (extraArgs[i + 1] ?? '').toLowerCase()
      if (
        val.includes('no-new-privileges=false') ||
        val === 'seccomp=unconfined' ||
        val === 'apparmor=unconfined' ||
        val === 'label=disable'
      ) {
        rejectDockerEscape(arg, 'security-opt weakens container isolation')
      }
    }
    if (lower === '--cap-add' || lower.startsWith('--cap-add=')) {
      rejectDockerEscape(arg, 'capabilities must be configured through policy.capabilities')
    }
  }
}

export const assertSafeDockerCapability = (cap: string): void => {
  const normalized = cap.replace(/^CAP_/, '').toUpperCase()
  if (DANGEROUS_CAPABILITIES.has(normalized)) {
    throw new SandboxError({
      code: 'AK_CONFIG_INVALID',
      message: `docker policy rejected capability ${JSON.stringify(cap)}`,
      hint: 'Do not re-add ALL/SYS_ADMIN/NET_ADMIN and similar high-risk capabilities after cap-drop.',
    })
  }
}

export const renderDockerArgs = (policy: DockerPolicy): readonly string[] => {
  assertAbsolutePath(policy.workspaceRoot, 'workspaceRoot')
  if (typeof policy.image !== 'string' || policy.image.trim() === '') {
    throw new SandboxError({
      code: 'AK_CONFIG_INVALID',
      message: 'docker policy.image must be a non-empty string',
    })
  }

  const extraArgs = policy.extraArgs ? [...policy.extraArgs] : []
  const capabilities = policy.capabilities ? [...policy.capabilities] : []
  assertSafeDockerExtraArgs(extraArgs)
  for (const cap of capabilities) assertSafeDockerCapability(cap)

  if (policy.network !== undefined && policy.network.toLowerCase() === 'host') {
    throw new SandboxError({
      code: 'AK_CONFIG_INVALID',
      message: 'docker policy.network "host" is not allowed',
      hint: 'Use "none" (default), "bridge", or a named user-defined network.',
    })
  }

  const target = policy.mountTarget ?? DEFAULT_MOUNT_TARGET
  const args: string[] = ['run', '--rm', '--init']
  args.push('--network', policy.network ?? 'none')
  args.push('--cap-drop', 'ALL')
  for (const cap of capabilities) args.push('--cap-add', cap)
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
  for (const a of extraArgs) args.push(a)
  args.push(policy.image)
  return args
}

export const dockerRuntime = (opts: DockerRuntimeOpts): SandboxRuntime => {
  const policy: DockerPolicy = {
    image: opts.policy.image,
    workspaceRoot: opts.policy.workspaceRoot,
    mountTarget: opts.policy.mountTarget,
    network: opts.policy.network,
    writableWorkspace: opts.policy.writableWorkspace,
    extraArgs: opts.policy.extraArgs ? [...opts.policy.extraArgs] : undefined,
    user: opts.policy.user,
    capabilities: opts.policy.capabilities ? [...opts.policy.capabilities] : undefined,
  }
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  const docker = opts.dockerPath ?? 'docker'
  const baseArgs = renderDockerArgs(policy)
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
