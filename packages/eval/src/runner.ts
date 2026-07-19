import { ErrorCodes, RuntimeError, type EvalResult, type EvalTestCase } from '@agentskit/core'
import type { RunEvalConfig } from './types'

function isTokenUsage(value: unknown): value is { prompt: number; completion: number } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  return (
    typeof o.prompt === 'number' &&
    Number.isFinite(o.prompt) &&
    Number.isInteger(o.prompt) &&
    o.prompt >= 0 &&
    typeof o.completion === 'number' &&
    Number.isFinite(o.completion) &&
    Number.isInteger(o.completion) &&
    o.completion >= 0
  )
}

/**
 * Runtime validation of AgentResponse. Throws a clear error on hostile shapes.
 */
function parseResponse(response: unknown): {
  content: string
  tokenUsage?: { prompt: number; completion: number }
} {
  if (typeof response === 'string') {
    return { content: response }
  }
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'Invalid AgentResponse: expected string or { content: string, tokenUsage?: { prompt, completion } }',
    })
  }
  const o = response as Record<string, unknown>
  if (typeof o.content !== 'string') {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'Invalid AgentResponse: content must be a string',
    })
  }
  if (o.tokenUsage !== undefined && !isTokenUsage(o.tokenUsage)) {
    throw new RuntimeError({
      code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
      message: 'Invalid AgentResponse: tokenUsage must contain non-negative finite integer prompt and completion counts',
    })
  }
  return {
    content: o.content,
    ...(o.tokenUsage !== undefined
      ? { tokenUsage: o.tokenUsage as { prompt: number; completion: number } }
      : {}),
  }
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

    let content = ''
    let tokenUsage: { prompt: number; completion: number } | undefined

    try {
      const response = await agent(testCase.input)
      const parsed = parseResponse(response)
      content = parsed.content
      tokenUsage = parsed.tokenUsage
    } catch (err) {
      results.push({
        input: testCase.input,
        output: '',
        passed: false,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    try {
      const passed = checkExpected(content, testCase.expected)
      results.push({
        input: testCase.input,
        output: content,
        passed,
        latencyMs: Date.now() - startTime,
        tokenUsage,
      })
    } catch (err) {
      // Expected-predicate failure: preserve agent output and tokenUsage.
      results.push({
        input: testCase.input,
        output: content,
        passed: false,
        latencyMs: Date.now() - startTime,
        tokenUsage,
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
