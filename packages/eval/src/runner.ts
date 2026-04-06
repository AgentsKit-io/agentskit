import type { EvalResult, EvalTestCase } from '@agentskit/core'
import type { AgentFn, AgentResponse, RunEvalConfig } from './types'

function parseResponse(response: AgentResponse): {
  content: string
  tokenUsage?: { prompt: number; completion: number }
} {
  if (typeof response === 'string') {
    return { content: response }
  }
  return response
}

function checkExpected(output: string, expected: EvalTestCase['expected']): boolean {
  if (typeof expected === 'function') {
    return expected(output)
  }
  return output.includes(expected)
}

export async function runEval(config: RunEvalConfig): Promise<EvalResult> {
  const { agent, suite } = config
  const results: EvalResult['results'] = []

  for (const testCase of suite.cases) {
    const startTime = Date.now()

    try {
      const response = await agent(testCase.input)
      const { content, tokenUsage } = parseResponse(response)
      const passed = checkExpected(content, testCase.expected)

      results.push({
        input: testCase.input,
        output: content,
        passed,
        latencyMs: Date.now() - startTime,
        tokenUsage,
      })
    } catch (err) {
      results.push({
        input: testCase.input,
        output: '',
        passed: false,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  return {
    totalCases: results.length,
    passed,
    failed,
    accuracy: results.length > 0 ? passed / results.length : 0,
    results,
  }
}
