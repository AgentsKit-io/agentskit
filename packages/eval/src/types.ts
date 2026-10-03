import type { EvalSuite, EvalResult } from '@agentskit/core'

/** Text returned by an evaluated agent, optionally with token counts. */
export type AgentResponse = string | {
  content: string
  tokenUsage?: { prompt: number; completion: number }
}

/** Async function that receives a test input and returns the agent response. */
export type AgentFn = (input: string) => Promise<AgentResponse>

/** Agent and test suite configuration for {@link runEval}. */
export interface RunEvalConfig {
  agent: AgentFn
  suite: EvalSuite
}

export type { EvalSuite, EvalResult }
