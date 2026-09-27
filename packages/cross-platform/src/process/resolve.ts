import crossSpawn from 'cross-spawn'
import which from 'which'
import { mapRuntimeError } from '../errors'
import { isWindows } from '../runtime'

interface ParsedCommand {
  command: string
  args: string[]
  options: { windowsVerbatimArguments?: boolean }
  /** Resolved executable on Windows; undefined when the command is not on PATH. */
  file?: string
}

type CrossSpawnParse = (command: string, args: string[], options: { cwd?: string; env?: Record<string, string> }) => ParsedCommand

// cross-spawn's parser does the hard Windows work: PATHEXT lookup, shebang
// detection, `.cmd`/`.bat` shims routed through cmd.exe with correct escaping
// (CVE-2024-27980 safe). Reusing it lets every runtime adapter share one
// resolution path instead of re-implementing cmd.exe quoting.
const parse = (crossSpawn as unknown as { _parse: CrossSpawnParse })._parse

export interface ResolvedCommand {
  command: string
  args: string[]
  windowsVerbatimArguments: boolean
  /** False when the command is known to be missing (detectable on Windows before spawning). */
  found: boolean
}

/** Resolve a command the way Windows needs it; a no-op on POSIX. */
export function resolveCommand(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env: Record<string, string> },
  windows: boolean = isWindows,
): ResolvedCommand {
  if (!windows) return { command, args: [...args], windowsVerbatimArguments: false, found: true }
  const parsed = parse(command, [...args], { cwd: options.cwd, env: options.env })
  return {
    command: parsed.command,
    args: parsed.args,
    windowsVerbatimArguments: parsed.options.windowsVerbatimArguments === true,
    found: parsed.file !== undefined,
  }
}

export interface WhichOptions {
  /** Search path. Defaults to the `PATH` of the current environment. */
  path?: string
  /** Windows executable extensions. Defaults to `PATHEXT`. */
  pathExt?: string
}

/**
 * Absolute path of an executable on PATH, honouring `PATHEXT` on Windows
 * (`npx` → `npx.cmd`). Resolves to null when it is not installed.
 */
export async function findExecutable(command: string, options: WhichOptions = {}): Promise<string | null> {
  try {
    return await which(command, { nothrow: true, path: options.path, pathExt: options.pathExt })
  } catch (error) {
    // which@2 ignores `nothrow` in promise mode and rejects with ENOENT.
    if ((error as { code?: unknown }).code === 'ENOENT') return null
    throw mapRuntimeError(error, 'read', command)
  }
}

/** True when the executable can be found on PATH. */
export async function commandExists(command: string, options: WhichOptions = {}): Promise<boolean> {
  return (await findExecutable(command, options)) !== null
}
