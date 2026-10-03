/**
 * Runtime inspection contract used by the MCP devtools server. The
 * tools package does not depend on `@agentskit/runtime` — instead
 * consumers wrap their runtime in a `RuntimeInspector` adapter and
 * pass it to `devtoolsTools()`. Same injection pattern as the email,
 * teams, and postgres-cdc tools.
 *
 * Reference adapter for `@agentskit/runtime` lives in that package's
 * `mcp-devtools` subpath (added in a follow-up PR).
 */

/** Lifecycle states reported by an inspected runtime session. */
export type SessionStatus = 'idle' | 'running' | 'paused' | 'streaming' | 'error' | 'completed'

/** Compact session metadata returned by a runtime inspector. */
export interface SessionSummary {
  id: string
  status: SessionStatus
  /** Wall-clock start time in ISO 8601. */
  startedAt: string
  messageCount: number
  /** Optional human-readable label (e.g. agent name). */
  label?: string
}

/** Message metadata and content captured in a session. */
export interface SessionMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  /** ISO 8601. */
  createdAt: string
  toolCallIds?: string[]
}

/** Session summary with messages and optional usage or error details. */
export interface SessionDetail extends SessionSummary {
  messages: SessionMessage[]
  /** Total tokens used so far, if the adapter reports them. */
  tokensUsed?: number
  /** Total cost so far, if observability is configured. */
  costUsd?: number
  /** Last error message if status === 'error'. */
  errorMessage?: string
}

/** Tool metadata exposed by a runtime inspector. */
export interface ToolSummary {
  name: string
  description?: string
  /** True when calling this tool requires user confirmation. */
  requiresConfirmation: boolean
}

/** Skill metadata exposed by a runtime inspector. */
export interface SkillSummary {
  name: string
  description?: string
}

/** Memory backend identity, entry count, and optional scope. */
export interface MemorySummary {
  /** Stable id for the memory backend (e.g. 'localStorage', 'pgvector'). */
  backend: string
  /** Number of stored entries. -1 when the backend cannot count cheaply. */
  entryCount: number
  /** Optional region or namespace, useful for multi-tenant inspection. */
  scope?: string
}

/** Result of advancing a session by one runtime step. */
export interface StepResult {
  /** Step index after the step completed. */
  step: number
  /** Most recent message produced by the step. */
  lastMessage?: SessionMessage
  status: SessionStatus
}

/** Identifier and state of a requested session replay. */
export interface ReplayHandle {
  replayId: string
  fromStep: number
  status: 'pending' | 'running' | 'completed' | 'error'
}

/** Name and optional metadata for an available evaluation. */
export interface EvalSummary {
  name: string
  description?: string
  testCount?: number
}

/** Pass and failure counts and duration for an evaluation run. */
export interface EvalResult {
  name: string
  passed: number
  failed: number
  durationMs: number
  /** Optional failure summary lines. */
  failures?: string[]
}

/**
 * Capability surface a runtime exposes for devtools inspection. Every
 * method is optional — devtools only registers the MCP tools whose
 * inspector method exists.
 *
 * **Mutation methods are write-side.** `stepRuntime`, `replaySession`,
 * `pauseRuntime`, `resumeRuntime`, and `runEval` all cause the runtime
 * to execute new work — tool calls, model invocations, side effects.
 * If you intend a read-only inspector for production monitoring, omit
 * those methods entirely. Do not implement them as no-ops; the gating
 * is structural (presence ⇒ tool registered), so an accidental no-op
 * implementation still exposes the tool over MCP. The mutating tools
 * each set `requiresConfirmation: true`, but a misconfigured client
 * that auto-approves can still bypass that gate.
 */
export interface RuntimeInspector {
  listSessions?: () => Promise<SessionSummary[]>
  inspectSession?: (sessionId: string) => Promise<SessionDetail>
  listTools?: () => Promise<ToolSummary[]>
  listSkills?: () => Promise<SkillSummary[]>
  listMemories?: (scope?: string) => Promise<MemorySummary[]>
  pauseRuntime?: (sessionId: string) => Promise<{ ok: true }>
  resumeRuntime?: (sessionId: string) => Promise<{ ok: true }>
  stepRuntime?: (sessionId: string) => Promise<StepResult>
  replaySession?: (sessionId: string, fromStep?: number) => Promise<ReplayHandle>
  listEvals?: () => Promise<EvalSummary[]>
  runEval?: (name: string) => Promise<EvalResult>
}
