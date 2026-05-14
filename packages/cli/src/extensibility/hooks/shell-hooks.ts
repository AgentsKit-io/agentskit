import { spawn } from 'node:child_process'
import type { HookEvent, HookHandler, HookPayload, HookResult } from '../plugins/types'

export interface ConfigHookEntry {
  /** Command to run. Executed through `sh -c`, so shell syntax is allowed. */
  run: string
  /** Optional regex string the hook's subject must match to fire. */
  matcher?: string
  /** Millisecond budget. Default 5000. */
  timeout?: number
}

export type ConfigHooksMap = Partial<Record<HookEvent, ConfigHookEntry[]>>

/**
 * Normalize `config.hooks` (shell entries) into `HookHandler[]`. The shell
 * command receives the JSON-serialized payload on stdin. It can print a
 * single JSON object on stdout to `modify` the payload, or exit non-zero
 * to `block`.
 *
 *   { "decision": "continue" }             — default, no output needed
 *   { "decision": "block", "reason": "…" }  — also signalled by non-zero exit
 *   { "decision": "modify", "payload": … }  — swaps the payload
 */
export function configHooksToHandlers(config: ConfigHooksMap | undefined): HookHandler[] {
  if (!config) return []
  const handlers: HookHandler[] = []
  for (const [event, entries] of Object.entries(config) as Array<[HookEvent, ConfigHookEntry[]]>) {
    for (const entry of entries) {
      handlers.push({
        event,
        matcher: entry.matcher ? new RegExp(entry.matcher) : undefined,
        run: (payload) => runShellHook(entry, payload),
      })
    }
  }
  return handlers
}

function runShellHook(entry: ConfigHookEntry, payload: HookPayload): Promise<HookResult> {
  return new Promise((resolvePromise) => {
    const timeoutMs = entry.timeout ?? 5000
    const child = spawn('sh', ['-c', entry.run], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })

    let stdout = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdin.on('error', () => { /* ignore EPIPE when child is killed mid-write */ })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        resolvePromise({
          decision: 'block',
          reason: `shell hook exited with code ${code}`,
        })
        return
      }
      const trimmed = stdout.trim()
      if (!trimmed) {
        resolvePromise({ decision: 'continue' })
        return
      }
      try {
        const parsed = JSON.parse(trimmed) as HookResult
        resolvePromise(parsed)
      } catch {
        // Hook printed non-JSON output; treat as continue.
        resolvePromise({ decision: 'continue' })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolvePromise({ decision: 'block', reason: err.message })
    })

    try {
      child.stdin.write(JSON.stringify(payload))
      child.stdin.end()
    } catch {
      /* ignore */
    }
  })
}
