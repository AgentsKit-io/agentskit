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
  | { type: 'error'; error: Error }

export interface Observer {
  name: string
  on: (event: AgentEvent) => void | Promise<void>
}
