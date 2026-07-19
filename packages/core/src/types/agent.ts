export type AgentEvent =
  | { type: 'llm:start'; model?: string; messageCount: number }
  | { type: 'llm:first-token'; latencyMs: number }
  | { type: 'llm:end'; content: string; usage?: { promptTokens: number; completionTokens: number }; durationMs: number }
  | { type: 'tool:start'; name: string; args: Record<string, unknown> }
  | { type: 'tool:end'; name: string; result: string; durationMs: number }
  | { type: 'memory:load'; messageCount: number }
  | { type: 'memory:save'; messageCount: number }
  | { type: 'agent:step'; step: number; action: string }
  | { type: 'agent:delegate:start'; name: string; task: string; depth: number }
  | { type: 'agent:delegate:end'; name: string; result: string; durationMs: number; depth: number }
  /**
   * A domain-level progress step the agent (not the runtime) defines — e.g. a
   * multi-stage pipeline reporting "classify", "sanitize", "publish". Lets agents
   * emit their own stages through the SAME observer channel as runtime events, so
   * one Observer renders both. The runtime never emits this; agents do.
   */
  | { type: 'progress'; label: string; status: 'start' | 'ok' | 'skip' | 'error'; detail?: string; durationMs?: number }
  | { type: 'run-aborted' }
  | { type: 'error'; error: Error }

export interface Observer {
  name: string
  on: (event: AgentEvent) => void | Promise<void>
}
