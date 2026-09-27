import type { AdapterChild, RuntimeAdapter, StdioMode } from './types'

/** The slice of `Bun.spawn` this adapter uses. */
export interface BunFileSink {
  write: (chunk: Uint8Array) => number
  flush: () => number | Promise<number>
  end: () => number | Promise<number>
}

export interface BunSubprocess {
  pid: number
  stdin: BunFileSink | number | null | undefined
  stdout: ReadableStream<Uint8Array> | number | null | undefined
  stderr: ReadableStream<Uint8Array> | number | null | undefined
  exited: Promise<number>
  exitCode: number | null
  signalCode: string | null
  kill: (signal?: string) => void
}

export interface BunRuntime {
  spawn: (
    cmd: string[],
    options: {
      cwd?: string
      env: Record<string, string>
      stdin: StdioMode
      stdout: StdioMode
      stderr: StdioMode
      windowsHide: boolean
      windowsVerbatimArguments: boolean
    },
  ) => BunSubprocess
}

function readable(stream: BunSubprocess['stdout']): ReadableStream<Uint8Array> | null {
  return typeof stream === 'object' && stream !== null ? stream : null
}

function writable(sink: BunSubprocess['stdin']): WritableStream<Uint8Array> | null {
  if (typeof sink !== 'object' || sink === null) return null
  return new WritableStream<Uint8Array>({
    async write(chunk) {
      sink.write(chunk)
      await sink.flush()
    },
    async close() {
      await sink.end()
    },
  })
}

/** Adapter over `Bun.spawn`: native web streams, no Node stream conversion. */
export function createBunAdapter(bun: BunRuntime): RuntimeAdapter {
  return request => {
    const proc = bun.spawn([request.command, ...request.args], {
      cwd: request.cwd,
      env: request.env,
      stdin: request.stdin,
      stdout: request.stdout,
      stderr: request.stderr,
      windowsHide: request.windowsHide,
      windowsVerbatimArguments: request.windowsVerbatimArguments,
    })
    const handle: AdapterChild = {
      pid: proc.pid,
      stdin: writable(proc.stdin),
      stdout: readable(proc.stdout),
      stderr: readable(proc.stderr),
      exited: proc.exited.then(() => ({
        code: proc.signalCode ? null : proc.exitCode,
        signal: proc.signalCode,
      })),
      kill: signal => {
        proc.kill(signal)
      },
    }
    return handle
  }
}
