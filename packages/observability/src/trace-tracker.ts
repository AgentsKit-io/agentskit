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

let nextSpanId = 0
function generateSpanId(): string {
  return `span-${Date.now()}-${nextSpanId++}`
}

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

  const endSpan = (attributes: Record<string, unknown> = {}, status: 'ok' | 'error' = 'ok'): TraceSpan | null => {
    const span = spanStack.pop()
    if (!span) return null
    span.endTime = Date.now()
    span.status = status
    Object.assign(span.attributes, attributes)
    callbacks.onSpanEnd(span)
    return span
  }

  return {
    handle(event: AgentEvent): void {
      switch (event.type) {
        case 'agent:step': {
          // Close previous step span if still open
          if (currentStepSpan && !currentStepSpan.endTime) {
            currentStepSpan.endTime = Date.now()
            callbacks.onSpanEnd(currentStepSpan)
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
            spanStack[spanStack.length - 1].attributes['gen_ai.response.first_token_ms'] = event.latencyMs
          }
          break
        case 'llm:end':
          endSpan({
            'gen_ai.response.content': event.content.slice(0, 500),
            'gen_ai.usage.input_tokens': event.usage?.promptTokens,
            'gen_ai.usage.output_tokens': event.usage?.completionTokens,
            'agentskit.duration_ms': event.durationMs,
          })
          break
        case 'tool:start':
          startSpan(`agentskit.tool.${event.name}`, {
            'agentskit.tool.name': event.name,
            'agentskit.tool.args': JSON.stringify(event.args),
          })
          break
        case 'tool:end':
          endSpan({
            'agentskit.tool.result': event.result.slice(0, 500),
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
          const span = spanStack.length > 0 ? spanStack[spanStack.length - 1] : currentStepSpan
          if (span) {
            span.attributes['error.message'] = event.error.message
            span.status = 'error'
          }
          break
        }
      }
    },
    flush(): void {
      // Close any remaining open spans
      while (spanStack.length > 0) endSpan({}, 'ok')
      if (currentStepSpan && !currentStepSpan.endTime) {
        currentStepSpan.endTime = Date.now()
        callbacks.onSpanEnd(currentStepSpan)
        currentStepSpan = null
      }
    },
  }
}
