import type { Scorer } from '../types'

const clamp = (n: number): number => Math.min(1, Math.max(0, n))

/** Score whether output matches an expected string, regular expression, or predicate.
 *
 * @param args Scorer input with the output and expected value.
 * @returns A binary `task_success` score, or zero when no expected value is supplied.
 */
export const taskSuccess: Scorer<string | RegExp | ((output: string) => boolean)> = ({ output, expected }) => {
  if (expected === undefined) {
    return { name: 'task_success', score: 0, rationale: 'no expected value provided' }
  }
  let pass: boolean
  if (typeof expected === 'function') {
    pass = expected(output)
  } else if (expected instanceof RegExp) {
    const isolated = new RegExp(expected.source, expected.flags)
    isolated.lastIndex = expected.lastIndex
    pass = isolated.test(output)
  } else {
    pass = output.includes(expected)
  }
  return { name: 'task_success', score: pass ? 1 : 0 }
}

/** Optional source strings read by {@link factualGrounding}. */
export interface FactualGroundingMeta {
  sources?: string[]
}

/** Score the fraction of provided source strings mentioned in the output.
 *
 * @param args Scorer input with output text and source metadata.
 * @returns The case-insensitive matched-source fraction, or zero when no sources are provided.
 */
export const factualGrounding: Scorer<unknown, FactualGroundingMeta> = ({ output, metadata }) => {
  const sources = metadata?.sources ?? []
  if (sources.length === 0) {
    return { name: 'factual_grounding', score: 0, rationale: 'no sources provided' }
  }
  const grounded = sources.filter(s => output.toLowerCase().includes(s.toLowerCase()))
  return {
    name: 'factual_grounding',
    score: clamp(grounded.length / sources.length),
    metadata: { matched: grounded.length, total: sources.length },
  }
}

/** Optional expected citation labels read by {@link citationCorrectness}. */
export interface CitationMeta {
  expectedCitations?: string[]
}

const CITATION_RE = /\[(\d+)\]|\(([^()]+\.[a-z]{2,4})\)|<source>([^<]+)<\/source>/gi

/** Score citations found in supported bracket, parenthesis, or source-tag forms.
 *
 * @param args Scorer input with output text and optional expected citations.
 * @returns The fraction of expected citations found, or a binary score when none are specified.
 */
export const citationCorrectness: Scorer<unknown, CitationMeta> = ({ output, metadata }) => {
  const expected = metadata?.expectedCitations ?? []
  const found = new Set<string>()
  for (const m of output.matchAll(CITATION_RE)) {
    found.add((m[1] ?? m[2] ?? m[3] ?? '').trim())
  }
  if (expected.length === 0) {
    return {
      name: 'citation_correctness',
      score: found.size > 0 ? 1 : 0,
      metadata: { foundCount: found.size },
    }
  }
  const hit = expected.filter(e => found.has(e))
  return {
    name: 'citation_correctness',
    score: clamp(hit.length / expected.length),
    metadata: { hit: hit.length, expected: expected.length },
  }
}

/** Optional tool call metadata read by {@link toolArgValidity}. */
export interface ToolArgValidityInput {
  toolCalls?: Array<{ name: string; args: unknown; schemaValid?: boolean }>
}

/** Score the fraction of recorded tool calls not marked schema-invalid.
 *
 * @param args Scorer input with optional tool call metadata.
 * @returns The valid-call fraction, or one when no tool calls are present.
 */
export const toolArgValidity: Scorer<unknown, ToolArgValidityInput> = ({ metadata }) => {
  const calls = metadata?.toolCalls ?? []
  if (calls.length === 0) {
    return { name: 'tool_arg_validity', score: 1, rationale: 'no tool calls' }
  }
  const valid = calls.filter(c => c.schemaValid !== false).length
  return {
    name: 'tool_arg_validity',
    score: clamp(valid / calls.length),
    metadata: { valid, total: calls.length },
  }
}
