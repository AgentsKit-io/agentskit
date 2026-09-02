import { parseToolArgs, createEventEmitter } from './primitives'
import { ErrorCodes, ToolError } from './errors'
import { auth, type ToolExecResult } from './agent-loop'
import type { AgentEventContext, ChatConfig, Message, StreamChunk, ToolCall, ToolDefinition } from './types'

type EventEmitter = ReturnType<typeof createEventEmitter>
type Authorize = NonNullable<ChatConfig['authorizeToolCall']>
type SetMessage = (id: string, updater: (current: Message) => Message) => void
type PatchCall = (assistantId: string, toolId: string, patch: Partial<ToolCall>) => void
type RunTool = (
  tool: ToolDefinition | undefined,
  call: ToolCall,
  onPartial: (result: string) => void,
  expectedGeneration?: number,
  correlation?: AgentEventContext,
) => Promise<ToolExecResult>

interface ToolCallContext {
  assistantId: string
  chunk: StreamChunk
  isCurrentGeneration: () => boolean
  toolMap: ReadonlyMap<string, ToolDefinition>
  messages: Message[]
  onToolCall: ChatConfig['onToolCall']
  authorize: Authorize
  emitter: EventEmitter
  setMessage: SetMessage
  patchCall: PatchCall
  runTool: RunTool
  correlation: AgentEventContext
  registerToolCall: (id: string) => void
}

export async function handleControllerToolCall({
  assistantId,
  chunk,
  isCurrentGeneration,
  toolMap,
  messages,
  onToolCall,
  authorize,
  emitter,
  setMessage,
  patchCall,
  runTool,
  correlation,
  registerToolCall,
}: ToolCallContext): Promise<void> {
  const call = chunk.toolCall
  if (!call) return

  const tool = toolMap.get(call.name)
  const parsedArgs = parseToolArgs(call.args)
  let status: ToolCall['status'] = 'pending'
  if (!parsedArgs.valid) status = 'error'
  else if (tool?.requiresConfirmation) status = 'requires_confirmation'
  const toolCall: ToolCall = {
    id: call.id,
    name: call.name,
    args: parsedArgs.args,
    result: call.result,
    status,
    ...(!parsedArgs.valid ? { error: 'Invalid tool arguments: expected a JSON object' } : {}),
  }

  if (!parsedArgs.valid) {
    setMessage(assistantId, current => ({ ...current, toolCalls: [...(current.toolCalls ?? []), toolCall] }))
    const error = new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: toolCall.error!,
      hint: 'The adapter must emit tool arguments as a JSON object.',
    })
    emitter.emit({ type: 'error', error, correlation })
    return
  }

  await auth(authorize, toolCall, { messages, tool, phase: 'propose' })
  if (!isCurrentGeneration()) return
  if (tool?.requiresConfirmation) registerToolCall(toolCall.id)

  setMessage(assistantId, current => ({ ...current, toolCalls: [...(current.toolCalls ?? []), toolCall] }))
  await onToolCall?.(toolCall, { messages, tool })
  if (!isCurrentGeneration()) return

  if (tool?.requiresConfirmation) {
    if (call.result) patchCall(assistantId, toolCall.id, { result: call.result, status: 'complete' })
    return
  }

  if (tool?.execute) patchCall(assistantId, toolCall.id, { status: 'running' })
  const outcome = await runTool(tool, toolCall, partial => {
    if (isCurrentGeneration()) patchCall(assistantId, toolCall.id, { result: partial })
  }, undefined, correlation)
  if (!isCurrentGeneration()) return

  patchCall(assistantId, toolCall.id, {
    status: outcome.status === 'complete' ? 'complete' : 'error',
    result: outcome.result,
    error: outcome.error,
  })
}
