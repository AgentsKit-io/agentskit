import type { JSONSchema7 } from 'json-schema'
import type { ToolDefinition, ToolExecutionContext } from './types/tool'

/**
 * One link in a composed tool: invoke `tool` with arguments derived
 * from the prior step's output (or the macro-call's original args),
 * optionally transform the result before feeding it into the next
 * link.
 */
export interface ComposeStep<TArgs extends Record<string, unknown> = Record<string, unknown>, TState = unknown> {
  tool: ToolDefinition
  /**
   * Map the current pipeline state into the sub-tool's arguments.
   * Receives the macro call's raw args and the accumulated state
   * (the result of every prior step, in declaration order).
   */
  mapArgs: (input: { args: TArgs; state: TState; prior: unknown[] }) => Record<string, unknown> | Promise<Record<string, unknown>>
  /**
   * Transform the sub-tool's raw output before storing it in state.
   * Default: pass the value through untouched.
   */
  mapResult?: (output: unknown, input: { args: TArgs; state: TState; prior: unknown[] }) => TState | Promise<TState>
  /**
   * Short-circuit the pipeline and return the current state when
   * this returns true. The step's sub-tool is still executed; use
   * `mapArgs` to skip if needed.
   */
  stopWhen?: (state: TState, input: { args: TArgs; prior: unknown[] }) => boolean
}

export interface ComposeToolOptions<TArgs extends Record<string, unknown> = Record<string, unknown>> {
  name: string
  description?: string
  schema?: JSONSchema7
  requiresConfirmation?: boolean
  tags?: string[]
  category?: string
  /** Execution steps. Run left-to-right; output becomes input of next. */
  steps: ComposeStep<TArgs, unknown>[]
  /**
   * Final reducer — receives the last state + every intermediate
   * output, returns the macro tool's result. Default: the last state.
   */
  finalize?: (input: { args: TArgs; prior: unknown[]; state: unknown }) => unknown | Promise<unknown>
  /** Observability — fires before/after each step. */
  onStep?: (event: {
    phase: 'start' | 'end' | 'skip'
    step: number
    tool: string
    args?: Record<string, unknown>
    result?: unknown
  }) => void
}

/**
 * Chain N tools into a single macro tool. The composed tool exposes
 * one schema to the model (`options.schema`) but under the hood runs
 * a fixed pipeline of sub-tools — a "skill" that always performs the
 * same multi-step recipe.
 *
 * Each step's `mapArgs` builds the next call from the running state;
 * `mapResult` transforms the output before it's stored. The final
 * step's state is returned unless a `finalize` reducer is given.
 */
export function composeTool<TArgs extends Record<string, unknown> = Record<string, unknown>>(
  options: ComposeToolOptions<TArgs>,
): ToolDefinition<TArgs> {
  if (options.steps.length === 0) {
    throw new Error(`composeTool("${options.name}"): at least one step required`)
  }

  return {
    name: options.name,
    description: options.description,
    schema: options.schema,
    requiresConfirmation: options.requiresConfirmation,
    tags: options.tags,
    category: options.category,
    async execute(args: TArgs, context: ToolExecutionContext): Promise<unknown> {
      const prior: unknown[] = []
      let state: unknown = undefined

      for (let i = 0; i < options.steps.length; i++) {
        const step = options.steps[i]!
        if (!step.tool.execute) {
          throw new Error(`composeTool("${options.name}"): step ${i} tool "${step.tool.name}" has no execute`)
        }
        const subArgs = await step.mapArgs({ args, state, prior })
        options.onStep?.({ phase: 'start', step: i, tool: step.tool.name, args: subArgs })
        const subCall = { ...context.call, name: step.tool.name, args: subArgs }
        const result = await step.tool.execute(subArgs, { messages: context.messages, call: subCall })
        prior.push(result)
        state = step.mapResult
          ? await step.mapResult(result, { args, state, prior })
          : result
        options.onStep?.({ phase: 'end', step: i, tool: step.tool.name, result })
        if (step.stopWhen?.(state, { args, prior })) {
          options.onStep?.({ phase: 'skip', step: i + 1, tool: 'remaining' })
          break
        }
      }

      if (options.finalize) return options.finalize({ args, prior, state })
      return state
    },
  }
}
