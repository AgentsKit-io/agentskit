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
    const errorMsg = `Tool "${toolCall.name}" not found or has no execute function`
    emitter.emit({ type: 'error', error: new Error(errorMsg) })
    return { status: 'error', error: errorMsg, durationMs: Date.now() - startTime }
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
    const errorMsg = error instanceof Error ? error.message : String(error)
    emitter.emit({
      type: 'tool:end',
      name: toolCall.name,
      result: `Error: ${errorMsg}`,
      durationMs: Date.now() - startTime,
    })
    emitter.emit({ type: 'error', error: error instanceof Error ? error : new Error(errorMsg) })
    return { status: 'error', error: errorMsg, durationMs: Date.now() - startTime }
  }
}
