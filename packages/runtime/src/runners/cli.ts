import { runCommand } from '@agentskit/cross-platform'
import { createTraceRecorder } from './trace'
import type { AgentRunner, RunnerResult, RunnerTask } from './types'

/** What a finished CLI invocation reported. */
export interface CliOutcome {
  code: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  aborted: boolean
}

/** Run `command` with an argv array (never a shell). Rejects only if the binary cannot start. */
export async function execCli(
  command: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<CliOutcome> {
  const res = await runCommand(command, args, opts)
  return {
    code: res.code,
    stdout: res.stdout,
    stderr: res.stderr,
    timedOut: res.timedOut,
    aborted: res.termination === 'aborted',
  }
}

/** Options shared by the CLI-backed runners. */
export interface CliRunnerOptions {
  /** Binary to run; defaults to `claude` / `codex`. */
  command?: string
  /** Extra argv inserted before the prompt. */
  extraArgs?: string[]
  /** Injected for tests; defaults to {@link execCli}. */
  exec?: typeof execCli
}

interface CliSpec {
  id: string
  command: string
  buildArgs(task: RunnerTask): string[]
  parse(stdout: string): { output: string; costUsd?: number }
}

function createCliRunner(spec: CliSpec, options: CliRunnerOptions): AgentRunner {
  const exec = options.exec ?? execCli
  return {
    id: spec.id,
    async run(task) {
      const trace = createTraceRecorder(spec.id, { 'runner.cwd': task.cwd })
      const call = trace.child(`${spec.id}.exec`)
      const fail = (status: RunnerResult['status'], error: string, output = ''): RunnerResult => {
        trace.end(call, 'error', { error })
        trace.end(trace.root, 'error')
        return { status, output, artifacts: [], trace: trace.spans(), error }
      }
      let outcome
      try {
        outcome = await exec(
          options.command ?? spec.command,
          [...spec.buildArgs(task), ...(options.extraArgs ?? [])],
          { cwd: task.cwd, timeoutMs: task.budget?.timeoutMs, signal: task.signal },
        )
      } catch (err) {
        return fail('failed', err instanceof Error ? err.message : String(err))
      }
      if (outcome.aborted) return fail('aborted', 'aborted', outcome.stdout)
      if (outcome.timedOut) return fail('failed', 'timeout exceeded', outcome.stdout)
      if (outcome.code !== 0) {
        return fail('failed', outcome.stderr.trim() || `exit code ${outcome.code}`, outcome.stdout)
      }
      const parsed = spec.parse(outcome.stdout)
      trace.end(call, 'ok', parsed.costUsd === undefined ? {} : { 'cost.usd': parsed.costUsd })
      trace.end(trace.root)
      return { status: 'completed', output: parsed.output, artifacts: [], trace: trace.spans(), costUsd: parsed.costUsd }
    },
  }
}

/** Claude Code CLI (`claude -p`). Maps allowed tools and the turn budget onto its flags; `maxCostUsd` is not enforced. */
export function claudeCodeRunner(options: CliRunnerOptions = {}): AgentRunner {
  return createCliRunner({
    id: 'claude-code',
    command: 'claude',
    buildArgs: task => {
      const args = ['-p', task.prompt, '--output-format', 'json']
      if (task.allowedTools?.length) args.push('--allowedTools', task.allowedTools.join(','))
      if (task.budget?.maxTurns !== undefined) args.push('--max-turns', String(task.budget.maxTurns))
      return args
    },
    parse: stdout => {
      try {
        const json = JSON.parse(stdout) as { result?: unknown; total_cost_usd?: unknown }
        return {
          output: typeof json.result === 'string' ? json.result : stdout.trim(),
          costUsd: typeof json.total_cost_usd === 'number' ? json.total_cost_usd : undefined,
        }
      } catch {
        return { output: stdout.trim() }
      }
    },
  }, options)
}

/** Codex CLI (`codex exec`). The CLI has no per-tool allow list, so `allowedTools` is not forwarded. */
export function codexRunner(options: CliRunnerOptions = {}): AgentRunner {
  return createCliRunner({
    id: 'codex',
    command: 'codex',
    buildArgs: task => ['exec', ...(task.cwd ? ['--cd', task.cwd] : []), task.prompt],
    parse: stdout => ({ output: stdout.trim() }),
  }, options)
}
