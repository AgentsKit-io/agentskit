import type { ToolDefinition } from './types/tool'

export interface SelfDebugInput {
  tool: ToolDefinition
  args: Record<string, unknown>
  error: Error
  attempt: number
}

export interface SelfDebugResult {
  /** Either corrected arguments (retry) or `null` to give up. */
  args: Record<string, unknown> | null
  /** Free-form note appended to telemetry. */
  reasoning?: string
}

export type SelfDebugger = (input: SelfDebugInput) => Promise<SelfDebugResult> | SelfDebugResult

export interface SelfDebugOptions {
  /** Max retry attempts after the original call. Default 2. */
  maxAttempts?: number
  /** Called on every failure + retry for observability. */
  onEvent?: (event: {
    type: 'failure' | 'retry' | 'give-up' | 'success'
    tool: string
    attempt: number
    error?: string
  }) => void
}

/**
 * Wrap any tool with a self-debug loop. When `execute` throws, the
 * configured `debugger` receives the error + args and can return
 * corrected args for another attempt. Give up by returning
 * `{ args: null }`. No retry happens on the original (attempt 0) call
 * — `maxAttempts` controls additional retries.
 *
 * This is the "agent fixes itself" pattern — typically plug in an
 * LLM call that reads the error + schema and emits new arguments.
 */
export function wrapToolWithSelfDebug(
  tool: ToolDefinition,
  selfDebugger: SelfDebugger,
  options: SelfDebugOptions = {},
): ToolDefinition {
  if (!tool.execute) throw new Error(`wrapToolWithSelfDebug: tool "${tool.name}" has no execute`)
  const maxAttempts = Math.max(0, options.maxAttempts ?? 2)

  return {
    ...tool,
    async execute(args, context) {
      let attempt = 0
      let currentArgs = { ...args }
      let lastError: Error | undefined
      while (true) {
        try {
          const result = await tool.execute!(currentArgs, context)
          options.onEvent?.({ type: 'success', tool: tool.name, attempt })
          return result
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          options.onEvent?.({
            type: 'failure',
            tool: tool.name,
            attempt,
            error: lastError.message,
          })
          if (attempt >= maxAttempts) {
            options.onEvent?.({ type: 'give-up', tool: tool.name, attempt, error: lastError.message })
            throw lastError
          }
          const decision = await selfDebugger({ tool, args: currentArgs, error: lastError, attempt })
          if (!decision.args) {
            options.onEvent?.({ type: 'give-up', tool: tool.name, attempt, error: lastError.message })
            throw lastError
          }
          attempt++
          currentArgs = decision.args
          options.onEvent?.({ type: 'retry', tool: tool.name, attempt })
        }
      }
    },
  }
}

/**
 * Debugger backed by a user-supplied async function that asks an LLM
 * to produce corrected JSON arguments. The helper handles prompt
 * construction + JSON parsing; plug in your own completion
 * (`runOnce(adapter, prompt)` via any runtime).
 */
export function createLlmSelfDebugger(
  complete: (prompt: string) => Promise<string>,
): SelfDebugger {
  return async ({ tool, args, error, attempt }) => {
    const prompt = `You are diagnosing a failed tool call and producing corrected arguments.

Tool: ${tool.name}
Description: ${tool.description ?? '(none)'}
Schema: ${JSON.stringify(tool.schema ?? {}, null, 2)}

Previous arguments (attempt ${attempt + 1}):
${JSON.stringify(args, null, 2)}

Error: ${error.message}

Emit a single JSON object with corrected arguments that should make the tool succeed. If you cannot recover, emit {"giveUp": true}. Return JSON only, no commentary.`

    let text: string
    try {
      text = await complete(prompt)
    } catch {
      return { args: null, reasoning: 'self-debugger upstream failed' }
    }

    const match = text.match(/```(?:json)?\s*([\s\S]+?)```/)
    const body = (match?.[1] ?? text).trim()
    const start = body.indexOf('{')
    const end = body.lastIndexOf('}')
    if (start < 0 || end <= start) return { args: null, reasoning: 'no JSON in debugger response' }

    try {
      const parsed = JSON.parse(body.slice(start, end + 1)) as Record<string, unknown> & { giveUp?: boolean }
      if (parsed.giveUp) return { args: null, reasoning: 'debugger gave up' }
      return { args: parsed }
    } catch {
      return { args: null, reasoning: 'debugger response was not valid JSON' }
    }
  }
}
