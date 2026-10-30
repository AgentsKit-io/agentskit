import { ErrorCodes, RuntimeError } from '@agentskit/core'
import { readText } from '@agentskit/net'
import { createTraceRecorder } from './trace'
import type { AgentRunner, RunnerArtifact } from './types'

const MAX_BODY_BYTES = 16 * 1024 * 1024

/** Options for {@link copilotKitRunner}. */
export interface CopilotKitRunnerOptions {
  /** Runtime endpoint of a CopilotKit / OpenBot agent. */
  url: string
  headers?: Record<string, string>
  /** Injected for tests; defaults to global `fetch`. */
  fetch?: typeof fetch
}

/**
 * CopilotKit / OpenBot over HTTP. POSTs `{ prompt, cwd, allowedTools, budget }` and expects
 * JSON `{ output, artifacts?, costUsd? }` (plain-text bodies are taken as the output).
 */
export function copilotKitRunner(options: CopilotKitRunnerOptions): AgentRunner {
  return {
    id: 'copilotkit',
    async run(task) {
      const trace = createTraceRecorder('copilotkit', { 'http.url': options.url })
      const call = trace.child('copilotkit.request')
      const controller = new AbortController()
      const onAbort = (): void => controller.abort()
      if (task.signal?.aborted) controller.abort()
      else task.signal?.addEventListener('abort', onAbort, { once: true })
      const timer = task.budget?.timeoutMs ? setTimeout(() => controller.abort(), task.budget.timeoutMs) : undefined
      try {
        const res = await (options.fetch ?? fetch)(options.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...options.headers },
          body: JSON.stringify({
            prompt: task.prompt,
            cwd: task.cwd,
            allowedTools: task.allowedTools,
            budget: task.budget,
          }),
          signal: controller.signal,
        })
        const text = await readText(res, { maxBytes: MAX_BODY_BYTES })
        if (!res.ok) throw new RuntimeError({
          code: ErrorCodes.AK_RUNTIME_STEP_FAILED,
          message: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        })
        let output = text
        let artifacts: RunnerArtifact[] = []
        let costUsd: number | undefined
        try {
          const json = JSON.parse(text) as { output?: unknown; artifacts?: RunnerArtifact[]; costUsd?: number }
          if (typeof json.output === 'string') output = json.output
          if (Array.isArray(json.artifacts)) artifacts = json.artifacts
          if (typeof json.costUsd === 'number') costUsd = json.costUsd
        } catch { /* plain text body */ }
        trace.end(call, 'ok', { 'http.status': res.status })
        trace.end(trace.root)
        return { status: 'completed', output, artifacts, trace: trace.spans(), costUsd }
      } catch (err) {
        const aborted = task.signal?.aborted === true
        const error = aborted ? 'aborted' : controller.signal.aborted ? 'timeout exceeded' : err instanceof Error ? err.message : String(err)
        trace.end(call, 'error', { error })
        trace.end(trace.root, 'error')
        return { status: aborted ? 'aborted' : 'failed', output: '', artifacts: [], trace: trace.spans(), error }
      } finally {
        if (timer) clearTimeout(timer)
        task.signal?.removeEventListener('abort', onAbort)
      }
    },
  }
}
