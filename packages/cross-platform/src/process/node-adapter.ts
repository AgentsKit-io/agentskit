import { spawn } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import type { AdapterChild, RuntimeAdapter } from './types'

/**
 * Node adapter. Command resolution and cmd.exe escaping already happened
 * (cross-spawn's parser), so this is a plain `child_process.spawn` with web
 * streams on top.
 */
export const nodeAdapter: RuntimeAdapter = request => {
  const child = spawn(request.command, request.args, {
    cwd: request.cwd,
    env: request.env,
    stdio: [request.stdin, request.stdout, request.stderr],
    windowsHide: request.windowsHide,
    windowsVerbatimArguments: request.windowsVerbatimArguments,
  })

  const exited = new Promise<{ code: number | null; signal: string | null }>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal }))
  })

  const handle: AdapterChild = {
    pid: child.pid,
    stdin: child.stdin ? (Writable.toWeb(child.stdin) as WritableStream<Uint8Array>) : null,
    stdout: child.stdout ? (Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>) : null,
    stderr: child.stderr ? (Readable.toWeb(child.stderr) as ReadableStream<Uint8Array>) : null,
    exited,
    kill: signal => {
      child.kill(signal)
    },
  }
  return handle
}
