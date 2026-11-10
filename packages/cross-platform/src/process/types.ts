/** Child process stream mode supported by the process adapters. */
export type StdioMode = 'pipe' | 'inherit' | 'ignore'

/** Working directory, environment, streams, timeout, and abort settings for a child process. */
export interface SpawnOptions {
  cwd?: string
  /**
   * Environment for the child. Defaults to the parent environment. Use
   * `safeEnv()` to pass only what the child needs.
   */
  env?: Record<string, string | undefined>
  /** Data written to stdin, which is then closed. Use it for long or multi-line prompts. */
  input?: string | Uint8Array
  stdin?: StdioMode
  stdout?: StdioMode
  stderr?: StdioMode
  /** Kill the whole process tree after this many milliseconds. */
  timeoutMs?: number
  /** Wait this long after the polite signal before force-killing. Default 2000. */
  killGraceMs?: number
  /** Kill the whole process tree when this signal aborts. */
  signal?: AbortSignal
  /** Hide the console window on Windows. Default true. */
  windowsHide?: boolean
}

/** Reason a process was terminated by this package. */
export type TerminationReason = 'timeout' | 'aborted' | 'killed'

/** Exit code and signal reported by a child process. */
export interface ExitStatus {
  code: number | null
  signal: string | null
  /** Set when this library terminated the process. */
  termination?: TerminationReason
}

/** A running child process with the same shape on Node, Bun and Deno. */
export interface ChildHandle {
  pid: number | undefined
  stdin: WritableStream<Uint8Array> | null
  stdout: ReadableStream<Uint8Array> | null
  stderr: ReadableStream<Uint8Array> | null
  /** Resolves on exit; rejects with CrossPlatformError when the process cannot start. */
  exited: Promise<ExitStatus>
  /** Kill the process and all of its descendants. */
  kill: (signal?: NodeJS.Signals) => Promise<void>
}

/** What a runtime adapter must provide. Resolution and escaping happen before it is called. */
export interface AdapterSpawnRequest {
  command: string
  args: string[]
  cwd: string | undefined
  env: Record<string, string>
  stdin: StdioMode
  stdout: StdioMode
  stderr: StdioMode
  windowsHide: boolean
  /** Arguments are already quoted for cmd.exe; the runtime must not quote them again. */
  windowsVerbatimArguments: boolean
}

export interface AdapterChild {
  pid: number | undefined
  stdin: WritableStream<Uint8Array> | null
  stdout: ReadableStream<Uint8Array> | null
  stderr: ReadableStream<Uint8Array> | null
  exited: Promise<{ code: number | null; signal: string | null }>
  /** Signal only this process (tree kill is layered on top). */
  kill: (signal: NodeJS.Signals) => void
}

export type RuntimeAdapter = (request: AdapterSpawnRequest) => AdapterChild
