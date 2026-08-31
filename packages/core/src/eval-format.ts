/**
 * Open Eval Format — a portable JSON file that describes an eval
 * suite (inputs, expected outputs, pass/fail rules) plus an
 * execution result. Compatible with standard CI reporters so one
 * dataset can be shared across frameworks.
 *
 * Version: 2026-04.
 */

export const EVAL_FORMAT_VERSION = '2026-04'

export interface EvalCaseExpectation {
  /** Literal substring match. */
  contains?: string
  /** Regular-expression source (body + flags separate, no surrounding slashes). */
  regex?: { body: string; flags?: string }
  /** Equality check after trim + lowercase normalization. */
  equalsNormalized?: string
  /** Min similarity (0..1) after embedding; depends on runner impl. */
  semanticSimilarity?: number
}

export interface EvalCase {
  id: string
  input: string
  expected?: EvalCaseExpectation | string
  metadata?: Record<string, unknown>
}

export interface EvalSuiteDoc {
  evalFormatVersion: typeof EVAL_FORMAT_VERSION
  name: string
  description?: string
  tags?: string[]
  cases: EvalCase[]
}

export interface EvalRunResult {
  evalFormatVersion: typeof EVAL_FORMAT_VERSION
  suite: string
  startedAt: string
  completedAt: string
  agent: { name?: string; version?: string }
  totals: {
    cases: number
    passed: number
    failed: number
    accuracy: number
  }
  cases: Array<{
    id: string
    input: string
    output: string
    passed: boolean
    latencyMs: number
    error?: string
  }>
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Invalid eval format: ${msg}`)
}

export function validateEvalSuite(raw: unknown): EvalSuiteDoc {
  assert(isRecord(raw), 'root must be an object')
  assert(raw.evalFormatVersion === EVAL_FORMAT_VERSION, `evalFormatVersion must be "${EVAL_FORMAT_VERSION}"`)
  assert(typeof raw.name === 'string', 'name required')
  assert(Array.isArray(raw.cases), 'cases must be array')

  const seenIds = new Set<string>()
  const cases = raw.cases.map((c: unknown, i: number): EvalCase => {
    assert(isRecord(c), `cases[${i}] must be an object`)
    assert(typeof c.id === 'string' && c.id.length > 0, `cases[${i}].id required`)
    assert(!seenIds.has(c.id), `cases[${i}].id must be unique`)
    seenIds.add(c.id)
    assert(typeof c.input === 'string', `cases[${i}].input required`)
    return c as unknown as EvalCase
  })

  return {
    evalFormatVersion: EVAL_FORMAT_VERSION,
    name: raw.name,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    tags: Array.isArray(raw.tags) && raw.tags.every(t => typeof t === 'string') ? (raw.tags as string[]) : undefined,
    cases,
  }
}

export function validateEvalRunResult(raw: unknown): EvalRunResult {
  assert(isRecord(raw), 'root must be an object')
  assert(raw.evalFormatVersion === EVAL_FORMAT_VERSION, `evalFormatVersion must be "${EVAL_FORMAT_VERSION}"`)
  assert(typeof raw.suite === 'string', 'suite required')
  assert(typeof raw.startedAt === 'string', 'startedAt required')
  assert(typeof raw.completedAt === 'string', 'completedAt required')
  assert(isRecord(raw.agent), 'agent required')
  assert(Array.isArray(raw.cases), 'cases must be array')
  assert(isRecord(raw.totals), 'totals required')
  const totals = raw.totals
  for (const field of ['cases', 'passed', 'failed'] as const) {
    assert(Number.isInteger(totals[field]) && (totals[field] as number) >= 0, `totals.${field} must be a non-negative integer`)
  }
  const totalCases = totals.cases as number
  const totalPassed = totals.passed as number
  const totalFailed = totals.failed as number
  assert(typeof totals.accuracy === 'number' && Number.isFinite(totals.accuracy) && totals.accuracy >= 0 && totals.accuracy <= 1, 'totals.accuracy must be between 0 and 1')
  assert(totalCases > 0, 'totals.cases must be greater than zero')
  assert(totalCases === raw.cases.length, 'totals.cases must match cases.length')
  assert(totalPassed + totalFailed === totalCases, 'totals passed + failed must equal cases')
  raw.cases.forEach((item: unknown, index: number) => {
    assert(isRecord(item), `cases[${index}] must be an object`)
    assert(typeof item.id === 'string' && item.id.length > 0, `cases[${index}].id required`)
    assert(typeof item.input === 'string', `cases[${index}].input required`)
    assert(typeof item.output === 'string', `cases[${index}].output required`)
    assert(typeof item.passed === 'boolean', `cases[${index}].passed must be boolean`)
    assert(Number.isFinite(item.latencyMs) && (item.latencyMs as number) >= 0, `cases[${index}].latencyMs must be non-negative`)
    if (item.error !== undefined) assert(typeof item.error === 'string', `cases[${index}].error must be string`)
  })
  return raw as unknown as EvalRunResult
}

/**
 * Evaluate whether an output satisfies a case's expectation.
 * Exported so custom runners can share the interpretation.
 */
export function matchesExpectation(output: string, expected: EvalCase['expected']): boolean {
  if (!expected) return true
  if (typeof expected === 'string') return output.includes(expected)
  if (expected.contains) return output.includes(expected.contains)
  if (expected.regex) {
    const pattern = new RegExp(expected.regex.body, expected.regex.flags)
    return pattern.test(output)
  }
  if (expected.equalsNormalized) {
    const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')
    return normalize(output) === normalize(expected.equalsNormalized)
  }
  // semanticSimilarity requires a runner-supplied embedder; it cannot pass by default.
  return false
}
