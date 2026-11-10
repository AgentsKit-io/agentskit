import { normalize } from 'node:path'
import crossSpawn from 'cross-spawn'
import escape from 'cross-spawn/lib/util/escape.js'
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

// A .cmd/.bat that forwards `%*` (every npm shim, including global ones in
// %APPDATA%\npm) makes cmd.exe parse the arguments twice, so `&`, `|`, `^`, `"`
// must be escaped twice. cross-spawn only does that for node_modules\.bin;
// apply it to every batch file so `x&y` never runs `y` as a command.
/** Escape a Windows batch command and arguments for cmd.exe invocation.
 *
 * @param command Command path.
 * @param args Arguments passed to the batch file.
 * @returns cmd.exe `/d /s /c` arguments. */
export function batchCommandLine(command: string, args: readonly string[]): string[] {
  const line = [escape.command(normalize(command)), ...args.map(arg => escape.argument(arg, true))].join(' ')
  return ['/d', '/s', '/c', `"${line}"`]
}

/** Executable invocation after PATH lookup and platform-specific argument escaping. */
export interface ResolvedCommand {
  command: string
  args: string[]
  windowsVerbatimArguments: boolean
  /** False when the command is known to be missing (detectable on Windows before spawning). */
  found: boolean
}

/**
 * Resolve a command against the child's PATH: cross-spawn's parser on Windows
 * (PATHEXT, .cmd shims, cmd.exe escaping), `which` on POSIX.
 */
export function resolveCommand(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env: Record<string, string> },
  windows: boolean = isWindows,
): ResolvedCommand {
  if (!windows) return resolvePosix(command, args, options.env)
  const parsed = parse(command, [...args], { cwd: options.cwd, env: options.env })
  const isBatch = parsed.options.windowsVerbatimArguments === true && /\.(?:cmd|bat)$/i.test(parsed.file ?? '')
  return {
    command: parsed.command,
    args: isBatch ? batchCommandLine(command, args) : parsed.args,
    windowsVerbatimArguments: parsed.options.windowsVerbatimArguments === true,
    found: parsed.file !== undefined,
  }
}

/**
 * The platform shell invocation for a command line: `sh -c <line>` on POSIX,
 * `%ComSpec% /d /s /c "<line>"` on Windows (arguments passed verbatim so
 * cmd.exe sees the line exactly as written).
 */
export function shellCommand(
  commandLine: string,
  env: Record<string, string>,
  windows: boolean = isWindows,
): ResolvedCommand {
  if (!windows) return { command: '/bin/sh', args: ['-c', commandLine], windowsVerbatimArguments: false, found: true }
  const comspec = Object.entries(env).find(([key]) => key.toLowerCase() === 'comspec')?.[1] ?? 'cmd.exe'
  return { command: comspec, args: ['/d', '/s', '/c', `"${commandLine}"`], windowsVerbatimArguments: true, found: true }
}

// Resolve bare POSIX commands against the child's PATH ourselves: runtimes
// disagree on whose PATH they search (Bun 1.1 searches the parent's) and on how a
// missing binary is reported. Paths with a separator are used as given.
function resolvePosix(command: string, args: readonly string[], env: Record<string, string>): ResolvedCommand {
  const passthrough = { command, args: [...args], windowsVerbatimArguments: false, found: true }
  if (command.includes('/') || env.PATH === undefined) return passthrough
  let file: string | null
  try {
    file = which.sync(command, { path: env.PATH, nothrow: true })
  } catch {
    // Lookup not permitted (e.g. Deno without --allow-read): let the runtime resolve it.
    return passthrough
  }
  return file === null ? { ...passthrough, found: false } : { ...passthrough, command: file }
}

/** Search path and executable extensions used when locating a command. */
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
