import { spawn, type ChildProcess, type ChildProcessWithoutNullStreams, type SpawnOptions as NodeSpawnOptions } from 'node:child_process'
import { isWindows } from '../runtime'
import { resolveCommand } from './resolve'

/** `child_process.spawn` options minus the ones this helper owns. */
export type NodeChildOptions = Omit<NodeSpawnOptions, 'shell' | 'windowsVerbatimArguments'>

function stringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) if (value !== undefined) result[key] = value
  return result
}

/**
 * `child_process.spawn` with the same command resolution as `spawnProcess`
 * (`.cmd`/`.bat` shims on Windows without `shell: true`, cmd.exe escaping,
 * PATH lookup against the child's env) for code that needs Node streams and
 * events (JSON-RPC over stdio, long-lived servers). Node, and Bun/Deno through
 * their `node:child_process` compatibility. A missing command surfaces the
 * usual `'error'` event (ENOENT). Kill the tree with `killProcessTree`.
 */
export function spawnNodeChild(
  command: string,
  args?: readonly string[],
  options?: NodeChildOptions & { stdio?: 'pipe' | ['pipe', 'pipe', 'pipe'] },
): ChildProcessWithoutNullStreams
export function spawnNodeChild(command: string, args?: readonly string[], options?: NodeChildOptions): ChildProcess
export function spawnNodeChild(command: string, args: readonly string[] = [], options: NodeChildOptions = {}): ChildProcess {
  const cwd = options.cwd === undefined ? undefined : String(options.cwd)
  const resolved = resolveCommand(command, args, { cwd, env: stringEnv(options.env ?? process.env) }, isWindows)
  return spawn(resolved.found ? resolved.command : command, resolved.found ? resolved.args : [...args], {
    windowsHide: true,
    ...options,
    shell: false,
    windowsVerbatimArguments: resolved.found && resolved.windowsVerbatimArguments,
  })
}
