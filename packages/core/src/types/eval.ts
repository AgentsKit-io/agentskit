/** Input and expected-output check used by an evaluation suite. */
export interface EvalTestCase {
  input: string
  expected: string | ((result: string) => boolean)
  metadata?: Record<string, unknown>
}

/** Aggregate score and per-case outcomes from an evaluation run. */
export interface EvalResult {
  totalCases: number
  passed: number
  failed: number
  accuracy: number
  results: Array<{
    input: string
    output: string
    passed: boolean
    latencyMs: number
    tokenUsage?: { prompt: number; completion: number }
    error?: string
  }>
}

/** Named collection of evaluation cases. */
export interface EvalSuite {
  name: string
  cases: EvalTestCase[]
}
