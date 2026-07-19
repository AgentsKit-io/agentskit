import { ToolError, ErrorCodes } from './errors'
import { executeToolCall, createToolLifecycle, createEventEmitter } from './primitives'
import type {
  ArgsValidator,
  MaybePromise,
  SkillDefinition,
  ToolCall,
  ToolAuthorizationContext,
  ToolAuthorizer,
  ToolDefinition,
  ToolExecutionContext,
} from './types'

// --- buildToolMap ---

export function buildToolMap(
  ...sources: Array<ToolDefinition[] | undefined>
): Map<string, ToolDefinition> {
  const map = new Map<string, ToolDefinition>()
  for (const source of sources) {
    if (!source) continue
    for (const tool of source) map.set(tool.name, tool)
  }
  return map
}

// --- activateSkills ---

export interface ActivateSkillsResult {
  systemPrompt: string | undefined
  skillTools: ToolDefinition[]
}

export async function activateSkills(
  skills: SkillDefinition[],
  prompt?: string,
): Promise<ActivateSkillsResult> {
  if (skills.length === 0) {
    return { systemPrompt: prompt, skillTools: [] }
  }

  const prompts = skills.map(s => `--- ${s.name} ---\n${s.systemPrompt}`)
  const base = prompt ? `${prompt}\n\n` : ''
  const system = `${base}${prompts.join('\n\n')}`

  const tools: ToolDefinition[] = []
  for (const skill of skills) {
    if (skill.onActivate) {
      const a = await skill.onActivate()
      tools.push(...(a.tools ?? []))
    }
  }

  return { systemPrompt: system, skillTools: tools }
}

// --- executeSafeTool ---

export interface ToolExecResult {
  status: 'complete' | 'error' | 'skipped'
  result?: string
  error?: string
  durationMs: number
}

export interface ExecuteSafeToolOptions {
  tool: ToolDefinition | undefined
  toolCall: ToolCall
  context: ToolExecutionContext
  emitter: ReturnType<typeof createEventEmitter>
  lifecycle: ReturnType<typeof createToolLifecycle>
  onPartial?: (result: string) => void
  onConfirm?: (toolCall: ToolCall) => MaybePromise<boolean>
  /** Opt-in arg validation against `tool.schema` (ADR-0008). */
  validate?: ArgsValidator
  authorize?: ToolAuthorizer
}

export async function auth(fn: ToolAuthorizer | undefined, call: ToolCall, context: ToolAuthorizationContext): Promise<void> {
  if (!fn) return
  await import('./tool-authorization-internal.js').then(m => m.authorize(fn, call, context))
}


export async function executeSafeTool(
  options: ExecuteSafeToolOptions,
): Promise<ToolExecResult> {
  const { tool, toolCall, context, emitter, lifecycle, onPartial, onConfirm, validate, authorize } = options
  const began = Date.now()

  // Missing tool
  if (!tool?.execute) {
    const err = new ToolError({
      code: ErrorCodes.AK_TOOL_NOT_FOUND,
      message: `Tool "${toolCall.name}" not found or has no execute function`,
      hint: 'Register an executable tool in ChatConfig, e.g. { tools: [myTool] }.',
    })
    emitter.emit({ type: 'error', error: err })
    return { status: 'error', error: err.toString(), durationMs: Date.now() - began }
  }

  if (validate && tool.schema) {
    const v = validate(tool.schema, toolCall.args)
    if (!v.valid) {
      const err = new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: v.message ?? `Tool "${toolCall.name}" received invalid arguments`,
      })
      emitter.emit({ type: 'error', error: err })
      return { status: 'error', error: err.toString(), durationMs: Date.now() - began }
    }
  }

  // Requires confirmation — refuse by default when no approver is configured (RT6)
  if (tool.requiresConfirmation) {
    if (!onConfirm) {
      return {
        status: 'skipped',
        result: 'No confirmation handler',
        durationMs: Date.now() - began,
      }
    }
    const confirmed = await onConfirm(toolCall)
    if (!confirmed) {
      return { status: 'skipped', result: 'Tool execution declined by confirmation handler', durationMs: Date.now() - began }
    }
  }

  try {
    await auth(authorize, toolCall, { ...context, tool, phase: 'execute' })
  } catch (error) {
    const err = error as ToolError
    emitter.emit({ type: 'error', error: err })
    return { status: 'error', error: err.toString(), durationMs: Date.now() - began }
  }

  await lifecycle.init(tool)

  emitter.emit({ type: 'tool:start', name: toolCall.name, args: toolCall.args })

  try {
    const result = await executeToolCall(
      tool,
      toolCall.args,
      context,
      onPartial,
    )
    emitter.emit({
      type: 'tool:end',
      name: toolCall.name,
      result,
      durationMs: Date.now() - began,
    })
    return { status: 'complete', result, durationMs: Date.now() - began }
  } catch (error) {
    const err = error instanceof ToolError
      ? error
      : new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `Tool "${toolCall.name}" threw during execution: ${error instanceof Error ? error.message : String(error)}`,
          hint: 'Check the tool execute() implementation.',
          cause: error,
        })
    // Emit error before tool:end so trackers can mark the active tool span.
    emitter.emit({ type: 'error', error: err })
    emitter.emit({
      type: 'tool:end',
      name: toolCall.name,
      result: `Error: ${err.message}`,
      durationMs: Date.now() - began,
    })
    return { status: 'error', error: err.toString(), durationMs: Date.now() - began }
  }
}
