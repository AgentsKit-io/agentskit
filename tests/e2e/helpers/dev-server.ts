import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as sleep } from 'node:timers/promises'

export interface DevServer {
  url: string
  close: () => Promise<void>
}

/**
 * Start a pnpm workspace filter dev server and wait until it responds on
 * the given port. Returns a URL + close() pair; always call close() in an
 * `afterAll` to avoid leaking ports across tests.
 */
export async function startDevServer(
  pkgFilter: string,
  port: number,
  readySignal = 'ready in',
): Promise<DevServer> {
  const env = { ...process.env, PORT: String(port), FORCE_COLOR: '0' }
  const child = spawn(
    'pnpm',
    ['--filter', pkgFilter, 'exec', 'vite', '--port', String(port), '--strictPort'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  )

  const output: string[] = []
  child.stdout?.on('data', (d) => output.push(String(d)))
  child.stderr?.on('data', (d) => output.push(String(d)))

  const ready = new Promise<void>((resolve, reject) => {
    const onData = (buf: Buffer) => {
      const text = buf.toString()
      if (text.toLowerCase().includes(readySignal)) {
        child.stdout?.off('data', onData)
        resolve()
      }
    }
    child.stdout?.on('data', onData)
    child.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Dev server exited with code ${code}\n${output.join('')}`))
    })
    setTimeout(() => reject(new Error(`Dev server did not become ready in 30s\n${output.join('')}`)), 30_000)
  })

  await ready
  await sleep(500)   // small grace period for first request

  return {
    url: `http://localhost:${port}`,
    async close() {
      child.kill('SIGTERM')
      await Promise.race([once(child, 'exit'), sleep(3_000)])
      if (!child.killed) child.kill('SIGKILL')
    },
  }
}

/**
 * Run a Node script via pnpm and collect its stdout. Used by headless
 * examples (runtime, ink) that don't need a browser.
 */
export async function runNodeExample(
  pkgFilter: string,
  script = 'dev',
  timeoutMs = 30_000,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const child = spawn('pnpm', ['--filter', pkgFilter, script], {
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const stdout: string[] = []
  const stderr: string[] = []
  child.stdout?.on('data', (d) => stdout.push(String(d)))
  child.stderr?.on('data', (d) => stderr.push(String(d)))

  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
  const [code] = (await once(child, 'exit')) as [number | null]
  clearTimeout(timer)

  return { stdout: stdout.join(''), stderr: stderr.join(''), code }
}
