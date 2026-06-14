// Local-process sandbox runtime contracts. These complement the cloud
// (E2B) `Sandbox` backend with host-process isolation primitives — the
// `SandboxRuntime` adapter the agent runner spawns tool subprocesses through.
//
// `SandboxLevel` ranks isolation strength; `SandboxRuntime` is the adapter
// each level implements; `Spawner` abstracts `child_process` so tests inject
// an in-memory double.

export const SANDBOX_LEVELS = ['none', 'process', 'container', 'vm', 'webcontainer'] as const
export type SandboxLevel = (typeof SANDBOX_LEVELS)[number]

/** Options for {@link SandboxRuntime.exec} — a command run to completion. */
export interface SandboxExecOptions {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd?: string
  /** Kill the process after this many ms. Undefined ⇒ no timeout. */
  readonly timeoutMs?: number
  /** Cap on captured stdout+stderr bytes. Undefined ⇒ runtime default. */
  readonly maxOutputBytes?: number
}

/** Result of {@link SandboxRuntime.exec}. */
export interface SandboxExecResult {
  /** Process exit code; -1 when killed before exiting. */
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  /** True when stdout or stderr was truncated at `maxOutputBytes`. */
  readonly truncated: boolean
  /** True when the process was killed by the `timeoutMs` deadline. */
  readonly timedOut: boolean
}

export interface SandboxRuntime {
  readonly level: SandboxLevel
  readonly name: string
  spawn(opts: { command: string; args: readonly string[]; cwd?: string }): Promise<{
    pid: number
    kill: () => Promise<void>
  }>
  /**
   * Run a command to completion inside the sandbox. Optional: a runtime that
   * only supports fire-and-forget `spawn` (e.g. `none`) omits it. Callers MUST
   * check for the method's presence and degrade when it is absent.
   */
  exec?(opts: SandboxExecOptions): Promise<SandboxExecResult>
}

export interface ChildHandle {
  readonly pid: number
  kill(): Promise<void>
}

export interface SpawnerExecOptions {
  command: string
  args: readonly string[]
  cwd?: string
  env?: Readonly<Record<string, string>>
  /** Kill the process after this many ms. Undefined ⇒ no timeout. */
  timeoutMs?: number
  /** Cap on captured stdout+stderr bytes. Undefined ⇒ 256 KiB. */
  maxOutputBytes?: number
}

export interface SpawnerExecResult {
  exitCode: number
  stdout: string
  stderr: string
  truncated: boolean
  timedOut: boolean
}

export interface Spawner {
  spawn(opts: {
    command: string
    args: readonly string[]
    cwd?: string
    env?: Readonly<Record<string, string>>
    stdio?: 'pipe' | 'inherit' | 'ignore'
  }): Promise<ChildHandle>
  /** Run a command to completion. Optional so fire-and-forget fakes satisfy `Spawner`. */
  exec?(opts: SpawnerExecOptions): Promise<SpawnerExecResult>
}
