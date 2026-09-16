import type { StreamChunk } from '@agentskit/core'
import { AdapterError, ErrorCodes } from '@agentskit/core'
import { parseCliJsonResponse } from './json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function claudeCodeError(message: string, cause?: unknown): AdapterError {
  return new AdapterError({
    code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
    message,
    cause,
    hint: 'Run `claude -p --output-format json "ping"` manually to inspect the envelope emitted by the installed Claude Code version.',
  })
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const RESPONSE_KEYS = ['text', 'reasoning', 'toolCalls'] as const

/**
 * Returns the AgentsKit CLI JSON response object embedded in a Claude Code
 * `result` string, or `undefined` when the result is plain prose.
 */
function embeddedResponse(result: string): Record<string, unknown> | undefined {
  const trimmed = result.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed)
  const candidate = fenced ? fenced[1]! : trimmed
  if (!candidate.startsWith('{') || !candidate.endsWith('}')) return undefined
  let value: unknown
  try {
    value = JSON.parse(candidate)
  } catch {
    return undefined
  }
  if (!isRecord(value) || !RESPONSE_KEYS.some(key => key in value)) return undefined
  return value
}

/**
 * Maps one `claude -p --output-format json` envelope to normalized stream
 * chunks. Used by the `claude-code-json` manifest with `createJsonCliAdapter`.
 *
 * - `result` becomes a `text` chunk. When the result is itself a JSON object
 *   following the `CliJsonResponse` shape (`text`, `reasoning`, `toolCalls`),
 *   for instance because the prompt carried a `[tools]` block, it is parsed
 *   with `parseCliJsonResponse` so tool calls surface as `tool_call` chunks.
 * - `structured_output` (from `--json-schema`) is preferred over `result`
 *   when it follows the same shape; otherwise it is emitted as JSON text.
 * - `usage.input_tokens` (+ cache tokens) and `usage.output_tokens` become a
 *   `usage` chunk; `session_id`, `total_cost_usd`, `duration_ms`, and
 *   `num_turns` are attached as metadata on the last chunk.
 * - `is_error: true` or a non-`success` subtype fails closed.
 */
export function parseClaudeCodeJsonResponse(value: unknown): readonly StreamChunk[] {
  if (!isRecord(value) || value.type !== 'result') throw claudeCodeError('Claude Code JSON output must be a `result` envelope')
  const result = typeof value.result === 'string' ? value.result : ''
  if (value.is_error === true || (typeof value.subtype === 'string' && value.subtype !== 'success')) {
    throw claudeCodeError(`Claude Code returned ${String(value.subtype ?? 'error')}${result ? `: ${result}` : ''}`)
  }
  const chunks: StreamChunk[] = []
  const structured = isRecord(value.structured_output) ? value.structured_output : undefined
  if (structured && RESPONSE_KEYS.some(key => key in structured)) {
    chunks.push(...parseCliJsonResponse(structured))
  } else if (structured) {
    chunks.push({ type: 'text', content: JSON.stringify(structured) })
  } else {
    const embedded = embeddedResponse(result)
    if (embedded) chunks.push(...parseCliJsonResponse(embedded))
    else if (result) chunks.push({ type: 'text', content: result })
  }
  if (isRecord(value.usage)) {
    const promptTokens = number(value.usage.input_tokens) + number(value.usage.cache_creation_input_tokens) + number(value.usage.cache_read_input_tokens)
    const completionTokens = number(value.usage.output_tokens)
    chunks.push({ type: 'usage', usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens } })
  }
  if (chunks.length === 0) throw claudeCodeError('Claude Code JSON output contains no semantic output')
  const metadata: Record<string, unknown> = {}
  for (const key of ['session_id', 'total_cost_usd', 'duration_ms', 'num_turns', 'subtype'] as const) {
    if (value[key] !== undefined) metadata[key] = value[key]
  }
  const last = chunks[chunks.length - 1]!
  chunks[chunks.length - 1] = { ...last, metadata: { ...last.metadata, ...metadata } }
  return chunks
}

/**
 * Decodes Claude Code stdout before `parseClaudeCodeJsonResponse`. Claude
 * Code prints a single JSON object, but a leading warning line or trailing
 * whitespace is tolerated by taking the last complete JSON object.
 */
export function parseClaudeCodeJsonOutput(stdout: string): unknown {
  const trimmed = stdout.trim()
  try {
    return JSON.parse(trimmed)
  } catch (error) {
    const start = trimmed.lastIndexOf('\n{')
    if (start < 0) throw claudeCodeError(`Claude Code stdout is not a JSON envelope: ${error instanceof Error ? error.message : String(error)}`, error)
    return JSON.parse(trimmed.slice(start + 1))
  }
}
