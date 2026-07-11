import { ErrorCodes, ToolError } from './errors'
import { cloneJsonRecord } from './json-validation'
import { buildMessage } from './primitives'
import type { ArgsValidator, ChatController, MaybePromise, ToolCall, ToolCallHandlerContext, ToolDefinition } from './types'

type Proposal = Pick<ToolCall, 'id' | 'name' | 'args'>
type Authority = readonly [
  ToolDefinition | undefined,
  ArgsValidator | undefined,
  ((toolCall: ToolCall, context: ToolCallHandlerContext) => MaybePromise<void>) | undefined,
]

export async function withAuthority(
  controller: ChatController,
  proposal: Proposal,
  resolve: (name: string) => Authority,
): Promise<ToolCall> {
  const identifier = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
  if (!identifier.test(proposal.id)) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'Invalid tool proposal identity' })
  }
  for (const message of controller.getState().messages) {
    const existing = message.toolCalls?.find(call => call.id === proposal.id)
    if (existing) return existing
  }
  if (!identifier.test(proposal.name)) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'Invalid tool proposal identity' })
  }
  const invalidArgs = (): never => {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'Invalid tool proposal arguments' })
  }
  const args = cloneJsonRecord(proposal.args, invalidArgs, 16_384)
  const [tool, validateArgs, onToolCall] = resolve(proposal.name)
  if (!tool?.requiresConfirmation || !tool.execute) {
    throw new ToolError({
      code: tool ? ErrorCodes.AK_CONFIG_INVALID : ErrorCodes.AK_TOOL_NOT_FOUND,
      message: 'Tool is not registered for confirmation',
    })
  }
  if (validateArgs && tool.schema) {
    const validation = validateArgs(tool.schema, args)
    if (!validation.valid) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: validation.message ?? 'Invalid tool arguments',
      })
    }
  }
  const call: ToolCall = { ...proposal, args, status: 'requires_confirmation' }
  const message = { ...buildMessage({ role: 'assistant', content: '' }), toolCalls: [call] }
  controller.setMessages([...controller.getState().messages, message])
  try {
    await onToolCall?.(call, { messages: controller.getState().messages, tool })
  } catch (error) {
    controller.setMessages(controller.getState().messages.map(current => current.id !== message.id ? current : {
      ...current,
      toolCalls: current.toolCalls?.map(existing => existing.id !== call.id ? existing : {
        ...existing,
        status: 'error',
        error: error instanceof Error ? error.message : 'Tool proposal rejected',
      }),
    }))
    throw error
  }
  return call
}
