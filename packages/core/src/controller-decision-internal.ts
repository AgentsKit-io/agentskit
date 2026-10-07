import { ErrorCodes, ConfigError, ToolError } from './errors'
import type { ToolExecResult } from './agent-loop'
import type { AgentEventContext, Message, ToolCall, ToolDefinition, ToolDecisionStore, ToolDecisionRecord } from './types'

interface DecisionContext {
  store: ToolDecisionStore | undefined
  load: (snapshot: Message[]) => Promise<Message[]>
  prepare: (messages: Message[]) => Promise<{ generation: number; correlation: AgentEventContext }>
  tool: (name: string) => ToolDefinition | undefined
  runTool: (tool: ToolDefinition | undefined, call: ToolCall, onPartial: (result: string) => void, generation: number, correlation: AgentEventContext) => Promise<ToolExecResult>
  patch: (assistantId: string, toolCallId: string, patch: Partial<ToolCall>) => void
  finish: (toolCallId: string) => void
  isCurrent: (generation: number) => boolean
  resume: (assistantId: string, generation: number, correlation: AgentEventContext) => Promise<void>
  messages: () => Message[]
  persist: (correlation: AgentEventContext) => Promise<void>
}

export async function decide(
  id: string,
  decision: 'approve' | 'deny',
  reason: string | undefined,
  context: DecisionContext,
): Promise<ToolCall> {
  if (typeof id !== 'string' || !id || (decision !== 'approve' && decision !== 'deny') || (reason !== undefined && typeof reason !== 'string')) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'Invalid tool decision' })
  }
  const store = context.store
  if (!store) throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'decide requires a conversation-scoped decisionStore' })
  const record = await store.claim(id, decision, reason)
  if (!record) {
    const existing = await store.get(id)
    if (!existing) throw new ToolError({ code: ErrorCodes.AK_ACTION_NOT_FOUND, message: 'Tool decision not found' })
    if (existing.decision === decision && existing.outcome && ['complete', 'failed', 'denied'].includes(existing.status)) return existing.outcome
    throw new ToolError({ code: ErrorCodes.AK_ACTION_ALREADY_DECIDED, message: 'Tool decision already claimed or decided' })
  }
  if (record.toolCallId !== id || record.status !== 'claimed' || record.decision !== decision || !Array.isArray(record.messages)) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'Decision store returned an invalid claim' })
  }
  const messages = await context.load(record.messages)
  for (const message of messages) {
    if (!message.toolCalls) continue
    const calls: ToolCall[] = []
    for (const call of message.toolCalls) {
      const sibling = call.id === id ? undefined : await store.get(call.id)
      calls.push(sibling?.outcome ?? call)
    }
    message.toolCalls = calls
  }
  const message = messages.find(m => m.role === 'assistant' && m.toolCalls?.some(c => c.id === id))
  const call = message?.toolCalls?.find(c => c.id === id)
  if (!message || !call || call.status !== 'requires_confirmation') {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'Decision store returned an invalid pending snapshot' })
  }
  const { generation, correlation } = await context.prepare(messages)
  let outcome: ToolCall
  if (decision === 'deny') {
    outcome = { ...call, status: 'error', error: `Permission denied: ${reason ?? 'user denied access'}` }
  } else {
    context.patch(message.id, id, { status: 'running' })
    try {
      const tool = context.tool(call.name)
      const result = await context.runTool(tool ? { ...tool, requiresConfirmation: false } : undefined, call,
        partial => { if (context.isCurrent(generation)) context.patch(message.id, id, { result: partial }) }, generation, correlation)
      outcome = { ...call, status: result.status === 'complete' ? 'complete' : 'error', result: result.result, error: result.error }
    } catch (cause) {
      outcome = { ...call, status: 'error', error: cause instanceof Error ? cause.message : String(cause) }
    }
  }
  context.patch(message.id, id, outcome)
  context.finish(id)
  const status = outcome.status === 'complete' ? 'complete' : 'failed'
  await store.settle({
    ...record,
    status: decision === 'deny' ? 'denied' : status,
    outcome,
    messages: context.messages(),
  })
  await context.persist(correlation)
  if (context.isCurrent(generation)) await context.resume(message.id, generation, correlation)
  return outcome
}
