import kleur from 'kleur'

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

export interface TunnelLike {
  url: string
  on(event: 'request' | 'error' | 'close', listener: (...args: unknown[]) => void): unknown
  close(): void
}

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
    (async (opts) => {
      const lt = (await import('localtunnel')).default
      return (await lt(opts)) as TunnelLike
    })

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
  let resolveDone: () => void
  const done = new Promise<void>(r => { resolveDone = r })

  tunnel.on('request', () => {
    requests++
  })

  tunnel.on('close', () => {
    if (stopped) return
    banner(`tunnel closed by remote`, 'yellow')
    resolveDone()
  })

  tunnel.on('error', (...args: unknown[]) => {
    const err = args[0] as Error | undefined
    banner(`error: ${err?.message ?? 'unknown'}`, 'red')
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
    tunnel.close()
    banner(`stopped — proxied ${requests} request${requests === 1 ? '' : 's'}`, 'cyan')
    resolveDone()
  }

  // Hook Ctrl+C — but only if we're attached to a TTY (don't break tests)
  if (process.stdin.isTTY) {
    process.on('SIGINT', () => {
      void stop()
    })
  }

  return {
    url: tunnel.url,
    done,
    stop,
    requests: () => requests,
  }
}
