import { spawn, type ChildProcess } from 'node:child_process'
import { resolve as pathResolve, basename } from 'node:path'
import { existsSync } from 'node:fs'
import chokidar from 'chokidar'
import kleur from 'kleur'

export interface DevOptions {
  /** Entry file to run (relative or absolute). */
  entry: string
  /** Globs to watch for changes. Defaults to common project files. */
  watch?: string[]
  /** Globs to ignore. */
  ignore?: string[]
  /** Args to pass through to the entry script. */
  scriptArgs?: string[]
  /** Debounce ms before restart after a change. */
  debounceMs?: number
  /**
   * Spawner override for tests. Defaults to spawning `tsx` (or `node` for
   * .js entries) as a child process.
   */
  spawn?: (cmd: string, args: string[]) => ChildProcess
  /** Watch override for tests. Defaults to chokidar. */
  watcher?: (paths: string[], opts: { ignored?: string[] }) => DevWatcher
  /** Stdout sink for tests. */
  stdout?: NodeJS.WritableStream
  /** Stderr sink for tests. */
  stderr?: NodeJS.WritableStream
}

export interface DevWatcher {
  on(event: 'change' | 'add' | 'unlink', listener: (path: string) => void): this
  close(): Promise<void>
}

const DEFAULT_WATCH = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.mjs',
  '**/*.json',
  '.agentskit.config.*',
]

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/.git/**',
  '**/coverage/**',
  '**/*.test.ts',
  '**/*.spec.ts',
]

/**
 * Run an entry file via tsx, restart it on relevant file changes.
 * Resolves when stop() is called or the watcher closes.
 *
 * Returns a controller so callers (and tests) can stop the loop and
 * inspect activity counters.
 */
export interface DevController {
  /** Promise that resolves when the dev session ends. */
  done: Promise<void>
  /** Stop the dev loop and clean up. */
  stop: () => Promise<void>
  /** Number of times the entry has been (re)started. */
  restarts: () => number
}

export function startDev(options: DevOptions): DevController {
  const entry = pathResolve(process.cwd(), options.entry)
  if (!existsSync(entry)) {
    throw new Error(`Entry file not found: ${entry}`)
  }

  const stdout = options.stdout ?? process.stdout
  const stderr = options.stderr ?? process.stderr
  const debounceMs = options.debounceMs ?? 200

  const isTs = entry.endsWith('.ts') || entry.endsWith('.tsx')
  const cmd = isTs ? 'tsx' : 'node'
  const baseArgs = [entry, ...(options.scriptArgs ?? [])]

  const spawnFn =
    options.spawn ??
    ((c: string, a: string[]) =>
      spawn(c, a, {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1' },
      }))

  const watchPaths = options.watch ?? DEFAULT_WATCH
  const ignorePaths = [...DEFAULT_IGNORE, ...(options.ignore ?? [])]
  const watcherFactory =
    options.watcher ??
    ((paths, opts) => chokidar.watch(paths, { ignored: opts.ignored, ignoreInitial: true }) as unknown as DevWatcher)

  const watcher = watcherFactory(watchPaths, { ignored: ignorePaths })

  let child: ChildProcess | undefined
  let restartCount = 0
  let restartTimer: NodeJS.Timeout | undefined
  let stopped = false
  let resolveDone: () => void
  const done = new Promise<void>(r => { resolveDone = r })

  const banner = (msg: string, color: 'green' | 'yellow' | 'red' | 'cyan' = 'green') => {
    const time = new Date().toTimeString().slice(0, 8)
    stdout.write(kleur[color](`[agentskit dev ${time}] `) + msg + '\n')
  }

  const startChild = () => {
    restartCount++
    banner(`▸ starting ${kleur.bold(basename(entry))} (restart #${restartCount - 1})`, 'cyan')

    const c = spawnFn(cmd, baseArgs)
    child = c
    c.stdout?.on('data', (d: Buffer) => stdout.write(d))
    c.stderr?.on('data', (d: Buffer) => stderr.write(d))
    c.on('exit', (code, signal) => {
      if (stopped) return
      if (signal === 'SIGTERM' || signal === 'SIGINT') return
      if (code === 0) {
        banner(`✓ exited cleanly — waiting for changes`, 'green')
      } else {
        banner(`✗ exited with code ${code} — waiting for changes`, 'red')
      }
    })
  }

  const restart = (path: string) => {
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      restartTimer = undefined
      banner(`↻ change detected — ${path}`, 'yellow')
      if (child && !child.killed && child.exitCode === null) {
        child.kill('SIGTERM')
      }
      // Brief pause so the SIGTERM is delivered before we spawn again.
      setTimeout(startChild, 80)
    }, debounceMs)
  }

  watcher.on('change', restart)
  watcher.on('add', restart)
  watcher.on('unlink', restart)

  startChild()

  const stop = async () => {
    if (stopped) return
    stopped = true
    if (restartTimer) clearTimeout(restartTimer)
    if (child && !child.killed && child.exitCode === null) {
      child.kill('SIGTERM')
    }
    await watcher.close()
    banner(`stopped`, 'cyan')
    resolveDone()
  }

  // Keyboard handling: 'r' = restart now, 'q' / Ctrl+C = stop
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', (data: Buffer) => {
      const key = data.toString()
      if (key === 'r') restart('manual')
      if (key === 'q' || key === '\u0003') void stop()
    })
  }

  return {
    done,
    stop,
    restarts: () => restartCount,
  }
}
