import type { EvalSuite, EvalResult } from '@agentskit/core'

export type AgentResponse = string | {
  content: string
  tokenUsage?: { prompt: number; completion: number }
}

export type AgentFn = (input: string) => Promise<AgentResponse>

export interface RunEvalConfig {
  agent: AgentFn
  suite: EvalSuite
}

export type { EvalSuite, EvalResult }
