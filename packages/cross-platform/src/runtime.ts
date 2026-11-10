import {
  isBun,
  isDeno,
  isLinux,
  isMacOS,
  isWindows,
  platform,
  runtime as detectedRuntime,
} from 'std-env'

/** JavaScript runtime the code is executing in.
 * Runtime names recognized by the portability helpers. */
export type RuntimeName = 'node' | 'bun' | 'deno' | 'browser' | 'edge' | 'unknown'

/** Operating system family. `unknown` in browsers and edge workers.
 * Operating system names recognized by the portability helpers. */
export type OsName = 'windows' | 'macos' | 'linux' | 'unknown'

/** Detected JavaScript runtime and operating system. */
export interface RuntimeInfo {
  runtime: RuntimeName
  os: OsName
  /** Raw platform string (`process.platform`), empty outside server runtimes. */
  platform: string
  /** True when the runtime can spawn processes and touch the filesystem. */
  isServer: boolean
}

function toRuntimeName(name: string): RuntimeName {
  if (name === 'node' || name === 'bun' || name === 'deno') return name
  if (name === 'workerd' || name === 'edge-light' || name === 'fastly' || name === 'netlify') return 'edge'
  if (typeof (globalThis as { window?: unknown }).window !== 'undefined') return 'browser'
  return 'unknown'
}

function toOsName(): OsName {
  if (isWindows) return 'windows'
  if (isMacOS) return 'macos'
  if (isLinux) return 'linux'
  return 'unknown'
}

/** Detect runtime and OS once. Detection is delegated to `std-env`. */
export function getRuntimeInfo(): RuntimeInfo {
  const runtime = toRuntimeName(detectedRuntime)
  return {
    runtime,
    os: toOsName(),
    platform,
    isServer: runtime === 'node' || runtime === 'bun' || runtime === 'deno',
  }
}

export { isBun, isDeno, isLinux, isMacOS, isWindows }
