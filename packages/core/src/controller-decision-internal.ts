export { buildToolContinuation } from './controller-helpers'
import { insertToolResults } from './controller-helpers'
import { buildMessage } from './primitives'
import { ErrorCodes, ConfigError, ToolError } from './errors'
import type { ToolExecResult } from './agent-loop'
import type { AgentEventContext, Message, ToolCall, ToolDefinition, ToolDecisionStore, ToolDecisionRecord } from './types'

interface DecisionContext {
  store: ToolDecisionStore | undefined
  load: (snapshot: Message[]) => Promise<{ messages: Message[]; fallback: boolean }>
  prepare: (messages: Message[], reconcile: (current: Message[]) => Message[] | undefined) => Promise<{ generation: number; correlation: AgentEventContext } | undefined>
  tool: (name: string) => ToolDefinition | undefined
  runTool: (tool: ToolDefinition | undefined, call: ToolCall, onPartial: (result: string) => void, generation: number, correlation: AgentEventContext) => Promise<ToolExecResult>
  patch: (assistantId: string, toolCallId: string, patch: Partial<ToolCall>) => void
  finish: (toolCallId: string) => void
  isCurrent: (generation: number) => boolean
  resume: (assistantId: string, generation: number, correlation: AgentEventContext) => Promise<void>
  setMessages: (messages: Message[]) => void
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
  const pending = await store.get(id)
  if (!pending) throw new ToolError({ code: ErrorCodes.AK_ACTION_NOT_FOUND, message: 'Tool decision not found' })
  if (pending.status !== 'pending') {
    if (pending.decision === decision) {
      const replay = pending.outcome ?? pending.messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === id)
      if (replay) return replay
    }
    throw new ToolError({ code: ErrorCodes.AK_ACTION_ALREADY_DECIDED, message: 'Tool decision already claimed or decided' })
  }
  const loaded = await context.load(pending.messages)
  if (loaded.fallback && pending.messages.some(message => message.status === 'streaming')) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'Resuming a streamed tool decision requires current ChatMemory' })
  }
  const messages = loaded.messages.map(message => ({ ...message, toolCalls: message.toolCalls?.map(call => ({ ...call })) }))
  const reconciled = new Map<string, ToolCall[]>()
  for (const message of messages) {
    if (!message.toolCalls) continue
    const calls: ToolCall[] = []
    const outcomes: ToolCall[] = []
    for (const call of message.toolCalls) {
      const sibling = call.id === id ? undefined : await store.get(call.id)
      calls.push(sibling?.outcome ?? call)
      if (sibling?.outcome) outcomes.push(sibling.outcome)
    }
    message.toolCalls = calls
    reconciled.set(message.id, outcomes)
  }
  const message = messages.find(m => m.role === 'assistant' && m.toolCalls?.some(c => c.id === id))
  let call = message?.toolCalls?.find(c => c.id === id)
  if (!message || !call || call.status !== 'requires_confirmation') {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'Decision store returned an invalid pending snapshot' })
  }
  const record = await store.claim(id, decision, reason)
  if (!record) {
    const existing = await store.get(id)
    if (!existing) throw new ToolError({ code: ErrorCodes.AK_ACTION_NOT_FOUND, message: 'Tool decision not found' })
    if (existing.decision === decision) {
      const replay = existing.outcome ?? existing.messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === id)
      if (replay) return replay
    }
    throw new ToolError({ code: ErrorCodes.AK_ACTION_ALREADY_DECIDED, message: 'Tool decision already claimed or decided' })
  }
  if (record.toolCallId !== id || record.status !== 'claimed' || record.decision !== decision || !Array.isArray(record.messages)) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'Decision store returned an invalid claim' })
  }
  const prepared = await context.prepare(messages, latest => {
    if (!latest.some(message => message.toolCalls?.some(call => call.id === id && call.status === 'requires_confirmation'))) return undefined
    return latest.map(message => ({ ...message, toolCalls: message.toolCalls?.map(call => {
      const outcome = reconciled.get(message.id)?.find(loaded => loaded.id === call.id)
      return call.id !== id && call.status === 'requires_confirmation' && outcome ? outcome : call
    }) }))
  })
  const current = context.messages().find(m => m.id === message.id)?.toolCalls?.find(c => c.id === id)
  if (!prepared || current?.status !== 'requires_confirmation') {
    const error = new ToolError({ code: ErrorCodes.AK_ACTION_ALREADY_DECIDED, message: 'Tool decision is no longer pending' })
    await store.settle({ ...record, status: 'failed', outcome: { ...call, status: 'error', error: error.message }, messages: context.messages() })
    throw error
  }
  const { generation, correlation } = prepared
  call = current
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
  const transcript = context.messages()
  const assistant = transcript.find(current => current.id === message.id)
  if (assistant && assistant.status !== 'streaming' && transcript[transcript.length - 1]?.id !== assistant.id) {
    context.setMessages(insertToolResults(transcript, assistant.id, assistant.toolCalls ?? [], buildMessage))
  }
  context.finish(id)
  const status = outcome.status === 'complete' ? 'complete' : 'failed'
  await store.settle({
    ...record,
    status: decision === 'deny' ? 'denied' : status,
    outcome,
    messages: context.messages(),
  })
  await context.persist(correlation)
  const latest = context.messages()
  const last = latest[latest.length - 1]
  if (context.isCurrent(generation) && last?.id === message.id && last?.status !== 'streaming'
    && !latest.some(message => message.toolCalls?.some(call => call.status !== 'complete' && call.status !== 'error'))) {
    await context.resume(message.id, generation, correlation)
  }
  return outcome
}
