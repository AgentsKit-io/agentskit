import { runShell, type RunResult } from '@agentskit/cross-platform'
import type { HookEvent, HookHandler, HookPayload, HookResult } from '../plugins/types'

const MAX_HOOK_STDOUT_BYTES = 64 * 1024

export interface ConfigHookEntry {
  /**
   * Command to run through the platform shell (`sh -c` on POSIX, `cmd.exe /d /s /c`
   * on Windows), so shell syntax is allowed. The process tree is killed on timeout.
   */
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

async function runShellHook(entry: ConfigHookEntry, payload: HookPayload): Promise<HookResult> {
  const timeoutMs = entry.timeout ?? 5000
  let result: RunResult
  try {
    result = await runShell(entry.run, {
      input: JSON.stringify(payload),
      timeoutMs,
      // Hooks are fire-and-judge: no grace period once the budget is spent.
      killGraceMs: 0,
      maxOutputBytes: MAX_HOOK_STDOUT_BYTES,
    })
  } catch (err) {
    return { decision: 'block', reason: err instanceof Error ? err.message : String(err) }
  }
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.truncated) {
    return { decision: 'block', reason: `shell hook output exceeded ${MAX_HOOK_STDOUT_BYTES} bytes` }
  }
  if (result.timedOut) return { decision: 'block', reason: `shell hook timed out after ${timeoutMs}ms` }
  if (result.code !== 0) return { decision: 'block', reason: `shell hook exited with code ${result.code}` }
  const trimmed = result.stdout.trim()
  if (!trimmed) return { decision: 'continue' }
  try {
    const parsed = JSON.parse(trimmed) as HookResult
    if (!parsed || typeof parsed !== 'object' || !('decision' in parsed) ||
        !['continue', 'block', 'modify'].includes(String(parsed.decision))) {
      return { decision: 'block', reason: 'shell hook returned an invalid decision' }
    }
    return parsed
  } catch {
    return { decision: 'block', reason: 'shell hook returned invalid JSON' }
  }
}
