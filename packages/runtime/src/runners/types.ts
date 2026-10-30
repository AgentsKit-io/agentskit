/** Span shape shared with `@agentskit/observability` (`TraceSpan`), so runner traces feed its sinks as-is. */
export interface RunnerTraceSpan {
  id: string
  name: string
  parentId: string | null
  startTime: number
  endTime?: number
  attributes: Record<string, unknown>
  status: 'ok' | 'error'
}

/** Limits a task must stay within. */
export interface RunnerBudget {
  /** Wall-clock limit for the whole task. */
  timeoutMs?: number
  /** Maximum agent turns, when the backend supports it. */
  maxTurns?: number
  /**
   * Maximum spend in USD. Accepted for forward compatibility but not enforced by any
   * current adapter; only `costUsd` is reported back on the result.
   */
  maxCostUsd?: number
}

/** A unit of work handed to a runner. */
export interface RunnerTask {
  prompt: string
  /** Working directory the agent operates in. */
  cwd?: string
  /** Tool names the agent may use; omitted means the backend default. */
  allowedTools?: string[]
  budget?: RunnerBudget
  signal?: AbortSignal
}

/** A file or blob a run produced. */
export interface RunnerArtifact {
  kind: 'file' | 'text' | 'json'
  name: string
  path?: string
  content?: string
}

/** Outcome of a run. */
export interface RunnerResult {
  status: 'completed' | 'failed' | 'aborted'
  /** Final answer from the agent. */
  output: string
  artifacts: RunnerArtifact[]
  trace: RunnerTraceSpan[]
  costUsd?: number
  error?: string
}

/** The single contract every agent backend implements: a task goes in; result, artifacts and trace come out. */
export interface AgentRunner {
  readonly id: string
  run(task: RunnerTask): Promise<RunnerResult>
}
