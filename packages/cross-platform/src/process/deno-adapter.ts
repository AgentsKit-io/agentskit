import type { AdapterChild, RuntimeAdapter, StdioMode } from './types'

/** The slice of `Deno.Command` this adapter uses. */
export interface DenoChildProcess {
  pid: number
  readonly stdin: WritableStream<Uint8Array>
  readonly stdout: ReadableStream<Uint8Array>
  readonly stderr: ReadableStream<Uint8Array>
  status: Promise<{ code: number; signal: string | null }>
  kill: (signal?: string) => void
}

export interface DenoCommandOptions {
  args: string[]
  cwd?: string
  env: Record<string, string>
  clearEnv: boolean
  stdin: 'piped' | 'inherit' | 'null'
  stdout: 'piped' | 'inherit' | 'null'
  stderr: 'piped' | 'inherit' | 'null'
  windowsRawArguments: boolean
}

export interface DenoRuntime {
  Command: new (command: string, options: DenoCommandOptions) => { spawn: () => DenoChildProcess }
}

function denoStdio(mode: StdioMode): 'piped' | 'inherit' | 'null' {
  if (mode === 'pipe') return 'piped'
  return mode === 'inherit' ? 'inherit' : 'null'
}

/**
 * Adapter over `Deno.Command`. Deno throws when a stream getter is read for
 * a non-piped stdio, so streams are only touched when piped.
 */
export function createDenoAdapter(deno: DenoRuntime): RuntimeAdapter {
  return request => {
    const child = new deno.Command(request.command, {
      args: request.args,
      cwd: request.cwd,
      env: request.env,
      clearEnv: true,
      stdin: denoStdio(request.stdin),
      stdout: denoStdio(request.stdout),
      stderr: denoStdio(request.stderr),
      windowsRawArguments: request.windowsVerbatimArguments,
    }).spawn()
    const handle: AdapterChild = {
      pid: child.pid,
      stdin: request.stdin === 'pipe' ? child.stdin : null,
      stdout: request.stdout === 'pipe' ? child.stdout : null,
      stderr: request.stderr === 'pipe' ? child.stderr : null,
      exited: child.status.then(status => ({
        code: status.signal ? null : status.code,
        signal: status.signal,
      })),
      kill: signal => {
        child.kill(signal)
      },
    }
    return handle
  }
}
