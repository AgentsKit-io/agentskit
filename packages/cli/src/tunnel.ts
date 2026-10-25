import { ConfigError } from '@agentskit/core'
import kleur from 'kleur'

/**
 * Local port and optional host, subdomain, callbacks, and tunnel provider override.

 */
export interface TunnelOptions {
  /** Local port to expose. Required. */
  port: number
  /** Optional subdomain hint (best-effort — provider may decline). */
  subdomain?: string
  /** Local hostname (default: 'localhost'). */
  host?: string
  /** Tunnel factory override for tests. Defaults to `localtunnel`. */
  open?: (opts: { port: number; subdomain?: string; local_host?: string }) => Promise<TunnelLike>
  /** Stdout/stderr sinks for tests. */
  stdout?: NodeJS.WritableStream
  /** Called once the tunnel URL is known. */
  onReady?: (url: string) => void
}

/**
 * Tunnel provider handle with its public URL and lifecycle methods.

 */
export interface TunnelLike {
  url: string
  on(event: 'request' | 'error' | 'close', listener: (...args: unknown[]) => void): unknown
  close(): void
}

/**
 * Public tunnel URL, completion promise, stop action, and request count.

 */
export interface TunnelController {
  /** The public URL once ready. */
  url: string
  /** Resolves when the tunnel closes (or stop() is called). */
  done: Promise<void>
  /** Stop the tunnel and resolve done. */
  stop: () => Promise<void>
  /** Number of requests proxied so far. */
  requests: () => number
}

type TunnelOpenOptions = { port: number; subdomain?: string; local_host?: string }

/** Install hint shown when the optional `localtunnel` provider is missing. */
export const TUNNEL_PROVIDER_HINT =
  'The tunnel command needs the optional "localtunnel" package. Install it with: npm install localtunnel (or pnpm add localtunnel)'

/**
 * Lazily load the optional `localtunnel` peer. The specifier is a variable so
 * neither the bundler nor tsc requires the package to be installed.
 */
export async function loadLocaltunnel(
  opts: TunnelOpenOptions,
  importer: (specifier: string) => Promise<unknown> = (s) => import(s),
): Promise<TunnelLike> {
  let mod: unknown
  try {
    mod = await importer('localtunnel')
  } catch (err) {
    const code = (err as { code?: string } | null)?.code
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      throw new ConfigError({
        code: 'AK_CONFIG_TUNNEL_PROVIDER_MISSING',
        message: TUNNEL_PROVIDER_HINT,
        cause: err,
      })
    }
    throw err
  }
  const lt = (mod as { default?: unknown }).default ?? mod
  return (await (lt as (o: TunnelOpenOptions) => Promise<unknown>)(opts)) as TunnelLike
}

/**
 * Open a public tunnel to a local port.
 *
 * Uses `localtunnel` by default — no account required, free, URL is
 * something like `https://word-word-12345.loca.lt`. First-time visitors
 * may see a `loca.lt` interstitial click-through; that's a known
 * provider quirk, not an AgentsKit issue.
 */
export async function startTunnel(options: TunnelOptions): Promise<TunnelController> {
  const stdout = options.stdout ?? process.stdout
  const open =
    options.open ??
    ((opts) => loadLocaltunnel(opts))

  const banner = (msg: string, color: 'green' | 'yellow' | 'red' | 'cyan' = 'green') => {
    const time = new Date().toTimeString().slice(0, 8)
    stdout.write(kleur[color](`[agentskit tunnel ${time}] `) + msg + '\n')
  }

  banner(`opening tunnel to ${options.host ?? 'localhost'}:${options.port}...`, 'cyan')

  const tunnel = await open({
    port: options.port,
    subdomain: options.subdomain,
    local_host: options.host,
  })

  let requests = 0
  let stopped = false
  let signalHandler: (() => void) | undefined
  let resolveDone: () => void
  const done = new Promise<void>(r => { resolveDone = r })

  tunnel.on('request', () => {
    requests++
  })

  tunnel.on('close', () => {
    if (stopped) return
    if (signalHandler) process.off('SIGINT', signalHandler)
    banner(`tunnel closed by remote`, 'yellow')
    resolveDone()
  })

  tunnel.on('error', (...args: unknown[]) => {
    const err = args[0] as Error | undefined
    banner(`error: ${err?.message ?? 'unknown'}`, 'red')
    resolveDone()
  })

  banner(`✓ ready`, 'green')
  stdout.write('\n')
  stdout.write(`  ${kleur.bold('Public URL:')}  ${kleur.cyan(tunnel.url)}\n`)
  stdout.write(`  ${kleur.bold('Local:')}       http://${options.host ?? 'localhost'}:${options.port}\n`)
  stdout.write('\n')
  stdout.write(kleur.dim(`  Forward webhooks here, then ${kleur.bold('Ctrl+C')} to stop.\n\n`))

  options.onReady?.(tunnel.url)

  const stop = async () => {
    if (stopped) return
    stopped = true
    if (signalHandler) process.off('SIGINT', signalHandler)
    tunnel.close()
    banner(`stopped — proxied ${requests} request${requests === 1 ? '' : 's'}`, 'cyan')
    resolveDone()
  }

  // Hook Ctrl+C — but only if we're attached to a TTY (don't break tests)
  if (process.stdin.isTTY) {
    signalHandler = () => {
      void stop()
    }
    process.on('SIGINT', signalHandler)
  }

  return {
    url: tunnel.url,
    done,
    stop,
    requests: () => requests,
  }
}
