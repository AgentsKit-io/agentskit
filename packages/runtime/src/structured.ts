import type { AdapterFactory, ChatMemory, Observer, SkillDefinition, ToolCall, ToolDefinition } from '@agentskit/core'
import { RuntimeError } from '@agentskit/core'
import { createRuntime } from './runner'

/**
 * Run a skill that must produce STRUCTURED output, and return it validated — the
 * first-class version of the pattern every pipeline agent hand-rolls (offer one
 * `submit_*` tool, run, read it back from `result.toolCalls`, parse).
 *
 * The model's only job is to call `tool` once; `execute` just acknowledges. The
 * `parse` callback validates the args (e.g. `(a) => MySchema.parse(a)` with Zod) so
 * this stays dependency-free — the runtime never imports Zod.
 *
 * ```ts
 * const cls = await invokeStructured({
 *   adapter, skill: classifier, task,
 *   tool: submitClassificationTool,
 *   parse: (args) => Classification.parse(args),
 * })
 * ```
 */
export async function invokeStructured<T>(opts: {
  adapter: AdapterFactory
  /** The submit tool the skill must call exactly once. */
  tool: ToolDefinition
  task: string
  /** Validate + shape the tool args (throws on invalid). */
  parse: (args: Record<string, unknown>) => T
  skill?: SkillDefinition
  /** Extra tools available during the run (besides `tool`). */
  tools?: ToolDefinition[]
  memory?: ChatMemory
  observers?: Observer[]
  onConfirm?: (toolCall: ToolCall) => boolean | Promise<boolean>
  maxSteps?: number
  signal?: AbortSignal
}): Promise<T> {
  const runtime = createRuntime({
    adapter: opts.adapter,
    tools: [opts.tool, ...(opts.tools ?? [])],
    memory: opts.memory,
    observers: opts.observers,
    onConfirm: opts.onConfirm,
    maxSteps: opts.maxSteps ?? 3,
  })
  const result = await runtime.run(opts.task, { skill: opts.skill, signal: opts.signal })
  const call = result.toolCalls.find((c) => c.name === opts.tool.name)
  if (!call)
    throw new RuntimeError({
      code: 'AK_STRUCTURED_NO_TOOL_CALL',
      message: `invokeStructured: ${opts.skill?.name ?? 'agent'} did not call ${opts.tool.name}`,
    })
  return opts.parse(call.args)
}
