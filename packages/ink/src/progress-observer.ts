import type { AgentEvent, Observer } from '@agentskit/core'

/**
 * Headless progress renderer for standalone (non-chat) agent runs. Returns an
 * Observer you pass in `observers: [...]`; it renders `{ type: 'progress' }`
 * AgentEvents as an animated spinner line per stage — no Ink/React render tree,
 * just ANSI, so it works in any terminal or CI log. Same braille frames as the
 * chat-UI ThinkingIndicator.
 *
 * ```ts
 * import { createProgressObserver } from '@agentskit/ink'
 * const agent = createMyAgent({ adapter, observers: [createProgressObserver()] })
 * ```
 */
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

const C = {
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
}

export interface ProgressObserverOptions {
  /** Where to write. Default: process.stdout. */
  write?: (chunk: string) => void
  /** Disable ANSI colors/animation (e.g. non-TTY CI). Default: !process.stdout.isTTY. */
  plain?: boolean
}

export function createProgressObserver(options: ProgressObserverOptions = {}): Observer {
  const write = options.write ?? ((s: string) => process.stdout.write(s))
  const plain = options.plain ?? !process.stdout?.isTTY
  let timer: ReturnType<typeof setInterval> | null = null
  let frame = 0
  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    name: 'progress-renderer',
    on(event: AgentEvent) {
      if (event.type !== 'progress') return
      const label = event.label.padEnd(12)

      if (event.status === 'start') {
        if (plain) {
          write(`  … ${event.label}\n`)
          return
        }
        stop()
        timer = setInterval(() => {
          frame = (frame + 1) % SPINNER_FRAMES.length
          write(`\r  ${C.cyan}${SPINNER_FRAMES[frame]}${C.reset} ${label}`)
        }, 80)
        return
      }

      stop()
      const sym = event.status === 'ok' ? '✓' : event.status === 'error' ? '⛔' : '–'
      const color = event.status === 'ok' ? C.green : event.status === 'error' ? C.red : C.yellow
      const time = event.durationMs ? ` ${C.dim}(${(event.durationMs / 1000).toFixed(1)}s)${C.reset}` : ''
      const cr = plain ? '' : '\r'
      const c = plain ? '' : color
      const r = plain ? '' : C.reset
      const d = plain ? '' : C.dim
      write(`${cr}  ${c}${sym}${r} ${label} ${d}${event.detail ?? ''}${r}${time}\n`)
    },
  }
}
