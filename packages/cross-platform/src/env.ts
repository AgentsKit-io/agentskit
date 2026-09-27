import { homedir, tmpdir } from 'node:os'
import { mapRuntimeError } from './errors'
import { isWindows } from './runtime'

export type Env = Record<string, string | undefined>

/**
 * Variables a child process needs to start and find executables on every
 * OS, without leaking secrets. Windows tools misbehave without `SystemRoot`,
 * `PATHEXT` and `COMSPEC`; `Path` is how Windows spells `PATH`.
 */
export const SYSTEM_ENV_KEYS: readonly string[] = [
  'PATH',
  'Path',
  'PATHEXT',
  'SystemRoot',
  'SystemDrive',
  'WINDIR',
  'COMSPEC',
  'ComSpec',
  'TMP',
  'TEMP',
  'TMPDIR',
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'ProgramData',
  'ProgramFiles',
  'ProgramFiles(x86)',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'LANG',
  'LC_ALL',
  'TERM',
]

function readProcessEnv(): Env {
  try {
    return { ...process.env }
  } catch (error) {
    throw mapRuntimeError(error, 'env', 'process.env')
  }
}

/**
 * Read one variable. Case-insensitive on Windows, where `Path` and `PATH`
 * are the same variable.
 */
export function getEnv(name: string, env: Env = readProcessEnv()): string | undefined {
  const direct = env[name]
  if (direct !== undefined || !isWindows) return direct
  const wanted = name.toLowerCase()
  for (const [key, value] of Object.entries(env)) {
    if (key.toLowerCase() === wanted) return value
  }
  return undefined
}

export interface SafeEnvOptions {
  /** Extra variable names to inherit from the parent environment. */
  inherit?: readonly string[]
  /** Values that override or extend the result. `undefined` removes a key. */
  extra?: Env
  /** Parent environment. Defaults to `process.env`. */
  source?: Env
}

/**
 * Minimal environment for a child process: the system variables every OS
 * needs, anything listed in `inherit`, then `extra`.
 */
export function safeEnv(options: SafeEnvOptions = {}): Record<string, string> {
  const source = options.source ?? readProcessEnv()
  const result: Record<string, string> = {}
  for (const name of [...SYSTEM_ENV_KEYS, ...(options.inherit ?? [])]) {
    const value = getEnv(name, source)
    if (value !== undefined) result[name] = value
  }
  for (const [name, value] of Object.entries(options.extra ?? {})) {
    if (value === undefined) delete result[name]
    else result[name] = value
  }
  return result
}

/** User home directory (`os.homedir()`; never reads `HOME` directly). */
export function homeDir(): string {
  return homedir()
}

/** OS temp directory (`os.tmpdir()`; never a hardcoded `/tmp`). */
export function tempDir(): string {
  return tmpdir()
}
