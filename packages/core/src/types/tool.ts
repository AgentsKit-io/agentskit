import type { JSONSchema7 } from 'json-schema'
import type { MaybePromise } from './common'
import type { Message } from './message'

export type ToolCallStatus = 'pending' | 'running' | 'complete' | 'error' | 'requires_confirmation'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  error?: string
  status: ToolCallStatus
}

export interface ToolExecutionContext {
  messages: Message[]
  call: ToolCall
}

export interface ToolDefinition {
  name: string
  description?: string
  schema?: JSONSchema7
  requiresConfirmation?: boolean
  execute?: (
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => MaybePromise<unknown> | AsyncIterable<unknown>
  init?: () => MaybePromise<void>
  dispose?: () => MaybePromise<void>
  tags?: string[]
  category?: string
}

export interface ToolCallHandlerContext {
  messages: Message[]
  tool?: ToolDefinition
}
