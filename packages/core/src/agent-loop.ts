import { ToolError, ErrorCodes } from './errors'
import { executeToolCall, createToolLifecycle, createEventEmitter } from './primitives'
import type {
  MaybePromise,
  SkillDefinition,
  ToolCall,
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
  baseSystemPrompt?: string,
): Promise<ActivateSkillsResult> {
  if (skills.length === 0) {
    return { systemPrompt: baseSystemPrompt, skillTools: [] }
  }

  const skillPrompts = skills.map(s => `--- ${s.name} ---\n${s.systemPrompt}`)
  const base = baseSystemPrompt ? `${baseSystemPrompt}\n\n` : ''
  const systemPrompt = `${base}${skillPrompts.join('\n\n')}`

  const skillTools: ToolDefinition[] = []
  for (const skill of skills) {
    if (skill.onActivate) {
      const activation = await skill.onActivate()
      skillTools.push(...(activation.tools ?? []))
    }
  }

  return { systemPrompt, skillTools }
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
}

export async function executeSafeTool(
  options: ExecuteSafeToolOptions,
): Promise<ToolExecResult> {
  const { tool, toolCall, context, emitter, lifecycle, onPartial, onConfirm } = options
  const startTime = Date.now()

  // Missing tool
  if (!tool?.execute) {
    const err = new ToolError({
      code: ErrorCodes.AK_TOOL_NOT_FOUND,
      message: `Tool "${toolCall.name}" not found or has no execute function`,
      hint: `Register the tool in your ChatConfig or runtime config, e.g. { tools: [myTool] }. Available tools must export an "execute" function.`,
    })
    emitter.emit({ type: 'error', error: err })
    return { status: 'error', error: err.toString(), durationMs: Date.now() - startTime }
  }

  // Requires confirmation
  if (tool.requiresConfirmation) {
    if (onConfirm) {
      const confirmed = await onConfirm(toolCall)
      if (!confirmed) {
        return { status: 'skipped', result: 'Tool execution declined by confirmation handler', durationMs: Date.now() - startTime }
      }
    }
    // No onConfirm callback = auto-confirm (backwards compatible)
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
      durationMs: Date.now() - startTime,
    })
    return { status: 'complete', result, durationMs: Date.now() - startTime }
  } catch (error) {
    const err = error instanceof ToolError
      ? error
      : new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `Tool "${toolCall.name}" threw during execution: ${error instanceof Error ? error.message : String(error)}`,
          hint: `Check the tool's execute() implementation. The error above comes from the tool itself, not AgentsKit.`,
          cause: error,
        })
    emitter.emit({
      type: 'tool:end',
      name: toolCall.name,
      result: `Error: ${err.message}`,
      durationMs: Date.now() - startTime,
    })
    emitter.emit({ type: 'error', error: err })
    return { status: 'error', error: err.toString(), durationMs: Date.now() - startTime }
  }
}
