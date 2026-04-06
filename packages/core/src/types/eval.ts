export interface EvalTestCase {
  input: string
  expected: string | ((result: string) => boolean)
  metadata?: Record<string, unknown>
}

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

export interface EvalSuite {
  name: string
  cases: EvalTestCase[]
}
