import type { AgentEvent } from '@agentskit/core'

export interface TraceSpan {
  id: string
  name: string
  parentId: string | null
  startTime: number
  endTime?: number
  attributes: Record<string, unknown>
  status: 'ok' | 'error'
}

export interface TraceTrackerCallbacks {
  onSpanStart: (span: TraceSpan) => void
  onSpanEnd: (span: TraceSpan) => void
}

const SNAPSHOT_LIMIT = 500

function boundSnapshot(value: string): string {
  return value.length > SNAPSHOT_LIMIT ? value.slice(0, SNAPSHOT_LIMIT) : value
}

/**
 * JSON-ish snapshot that never throws on circular refs or BigInt.
 * Result is always a string, bounded to SNAPSHOT_LIMIT.
 */
function safeSnapshot(value: unknown): string {
  try {
    if (typeof value === 'string') return boundSnapshot(value)
    const seen = new WeakSet<object>()
    const json = JSON.stringify(value, (_key, current: unknown) => {
      if (typeof current === 'bigint') return current.toString()
      if (typeof current === 'object' && current !== null) {
        if (seen.has(current)) return '[Circular]'
        seen.add(current)
      }
      return current
    })
    return boundSnapshot(json ?? 'null')
  } catch {
    return '[Unserializable]'
  }
}

let nextSpanId = 0
function generateSpanId(): string {
  return `span-${Date.now()}-${nextSpanId++}`
}

/**
 * Builds nested spans from a sequential AgentEvent stream.
 *
 * Assumption: events for the same kind (llm/tool/delegate) are sequential
 * and non-interleaved. AgentEvent has no correlation id, so this tracker
 * uses a LIFO stack and does **not** support parallel same-kind operations.
 */
export function createTraceTracker(callbacks: TraceTrackerCallbacks) {
  const spanStack: TraceSpan[] = []
  let currentStepSpan: TraceSpan | null = null

  const currentParentId = (): string | null => {
    if (spanStack.length > 0) return spanStack[spanStack.length - 1].id
    return currentStepSpan?.id ?? null
  }

  const startSpan = (name: string, attributes: Record<string, unknown> = {}): TraceSpan => {
    const span: TraceSpan = {
      id: generateSpanId(),
      name,
      parentId: currentParentId(),
      startTime: Date.now(),
      attributes,
      status: 'ok',
    }
    spanStack.push(span)
    callbacks.onSpanStart(span)
    return span
  }

  const endSpan = (
    attributes: Record<string, unknown> = {},
    status?: 'ok' | 'error',
  ): TraceSpan | null => {
    const span = spanStack.pop()
    if (!span) return null
    span.endTime = Date.now()
    // Preserve error status set by a prior error event unless explicitly overridden.
    if (status !== undefined) span.status = status
    Object.assign(span.attributes, attributes)
    callbacks.onSpanEnd(span)
    return span
  }

  const closeStep = (attributes: Record<string, unknown> = {}, status?: 'ok' | 'error'): void => {
    if (!currentStepSpan || currentStepSpan.endTime) return
    currentStepSpan.endTime = Date.now()
    // Never downgrade an existing error status.
    if (status === 'error') {
      currentStepSpan.status = 'error'
    } else if (status !== undefined && currentStepSpan.status !== 'error') {
      currentStepSpan.status = status
    }
    Object.assign(currentStepSpan.attributes, attributes)
    callbacks.onSpanEnd(currentStepSpan)
    currentStepSpan = null
  }

  const abortOpen = (): void => {
    while (spanStack.length > 0) {
      endSpan({ 'agentskit.abort': true }, 'error')
    }
    closeStep({ 'agentskit.abort': true }, 'error')
  }

  /** Close orphaned child spans as incomplete errors before changing step. */
  const closeOrphans = (): void => {
    while (spanStack.length > 0) {
      endSpan({ 'agentskit.incomplete': true }, 'error')
    }
  }

  return {
    handle(event: AgentEvent): void {
      switch (event.type) {
        case 'agent:step': {
          // Orphans first so the new step/children never parent to stale spans.
          const hadOrphans = spanStack.length > 0
          closeOrphans()
          // With orphan children, the previous step also closes as incomplete error.
          // Natural step transitions (no orphans) close the previous step as-is.
          if (hadOrphans) {
            closeStep({ 'agentskit.incomplete': true }, 'error')
          } else {
            closeStep()
          }
          currentStepSpan = {
            id: generateSpanId(),
            name: `agentskit.agent.step`,
            parentId: null,
            startTime: Date.now(),
            attributes: { 'agentskit.step': event.step, 'agentskit.action': event.action },
            status: 'ok',
          }
          callbacks.onSpanStart(currentStepSpan)
          break
        }
        case 'llm:start':
          startSpan('gen_ai.chat', {
            'gen_ai.system': 'agentskit',
            'gen_ai.request.model': event.model ?? 'unknown',
            'agentskit.message_count': event.messageCount,
          })
          break
        case 'llm:first-token':
          // Add attribute to current LLM span
          if (spanStack.length > 0) {
            spanStack[spanStack.length - 1]!.attributes['gen_ai.response.first_token_ms'] = event.latencyMs
          }
          break
        case 'llm:end':
          endSpan({
            'gen_ai.response.content': boundSnapshot(event.content),
            'gen_ai.usage.input_tokens': event.usage?.promptTokens,
            'gen_ai.usage.output_tokens': event.usage?.completionTokens,
            'agentskit.duration_ms': event.durationMs,
          })
          break
        case 'tool:start':
          startSpan(`agentskit.tool.${event.name}`, {
            'agentskit.tool.name': event.name,
            'agentskit.tool.args': safeSnapshot(event.args),
          })
          break
        case 'tool:end':
          endSpan({
            'agentskit.tool.result': boundSnapshot(event.result),
            'agentskit.duration_ms': event.durationMs,
          })
          break
        case 'agent:delegate:start':
          startSpan(`agentskit.agent.delegate.${event.name}`, {
            'agentskit.delegate.name': event.name,
            'agentskit.delegate.depth': event.depth,
            'agentskit.delegate.task': boundSnapshot(event.task),
          })
          break
        case 'agent:delegate:end':
          endSpan({
            'agentskit.delegate.name': event.name,
            'agentskit.delegate.depth': event.depth,
            'agentskit.delegate.result': boundSnapshot(event.result),
            'agentskit.duration_ms': event.durationMs,
          })
          break
        case 'memory:load':
          startSpan('agentskit.memory.load', { 'agentskit.message_count': event.messageCount })
          endSpan()
          break
        case 'memory:save':
          startSpan('agentskit.memory.save', { 'agentskit.message_count': event.messageCount })
          endSpan()
          break
        case 'error': {
          const message = event.error.message
          // Mark active child (if any) and the current step so the parent does
          // not report ok when a child fails.
          if (spanStack.length > 0) {
            const child = spanStack[spanStack.length - 1]!
            child.attributes['error.message'] = message
            child.status = 'error'
          }
          if (currentStepSpan) {
            currentStepSpan.attributes['error.message'] = message
            currentStepSpan.status = 'error'
          }
          break
        }
        case 'run-aborted':
          abortOpen()
          break
      }
    },
    flush(): void {
      // Close any remaining open spans. Idempotent: a second call is a no-op.
      while (spanStack.length > 0) endSpan()
      closeStep()
    },
  }
}
