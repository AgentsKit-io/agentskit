// SandboxRegistry — resolves a SandboxLevel to its registered runtime.
// Strictness helpers surface that `none`/`process` provide no OS-level
// fs/net isolation, so callers don't silently believe `process` is sandboxed.

import { SandboxError } from '@agentskit/core'
import { noneSandbox, processSandbox } from './local-runtimes'
import type { SandboxLevel, SandboxRuntime } from './local-sandbox-types'

export class SandboxRegistry {
  private readonly map = new Map<SandboxLevel, SandboxRuntime>()

  constructor(includeBuiltins = true) {
    if (includeBuiltins) {
      this.register(noneSandbox)
      this.register(processSandbox())
    }
  }

  register(runtime: SandboxRuntime): void {
    this.map.set(runtime.level, runtime)
  }

  has(level: SandboxLevel): boolean {
    return this.map.has(level)
  }

  get(level: SandboxLevel): SandboxRuntime | undefined {
    return this.map.get(level)
  }

  list(): readonly SandboxLevel[] {
    return [...this.map.keys()]
  }

  resolveOrThrow(level: SandboxLevel): SandboxRuntime {
    const runtime = this.map.get(level)
    if (!runtime) {
      throw new SandboxError({
        code: 'AK_SANDBOX_BACKEND_FAILED',
        message: `no sandbox runtime registered for level "${level}" (have: ${this.list().join(', ')})`,
      })
    }
    return runtime
  }
}

const STRONG_LEVELS: ReadonlySet<SandboxLevel> = new Set(['container', 'vm', 'webcontainer'])
const WEAK_LEVELS: ReadonlySet<SandboxLevel> = new Set(['none', 'process'])

export const isStrongIsolation = (level: SandboxLevel): boolean => STRONG_LEVELS.has(level)
export const isWeakIsolation = (level: SandboxLevel): boolean => WEAK_LEVELS.has(level)

export class WeakSandboxError extends Error {
  readonly code = 'sandbox.weak_isolation'
  readonly active: SandboxLevel
  constructor(active: SandboxLevel) {
    super(
      `active sandbox level "${active}" provides no OS-level fs/net isolation; ` +
        `expected one of: container, vm, webcontainer. Configure a stronger level ` +
        `or pass { allowWeak: true } to opt-in explicitly.`,
    )
    this.active = active
  }
}

/** Throw `WeakSandboxError` if the active level offers no OS-level isolation. */
export const assertStrongIsolation = (
  active: SandboxLevel,
  opts: { readonly allowWeak?: boolean } = {},
): void => {
  if (opts.allowWeak === true) return
  if (isWeakIsolation(active)) throw new WeakSandboxError(active)
}

/** Stderr-printable weak-isolation banner for runner startup. */
export const weakSandboxBanner = (active: SandboxLevel): string =>
  `[security] sandbox level "${active}" — no OS-level fs/net isolation. ` +
  `child processes can read/write the filesystem and open sockets. Set ` +
  `sandbox level to container/vm to enforce kernel-level boundaries.`
