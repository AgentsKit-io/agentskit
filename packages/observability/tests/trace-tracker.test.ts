import { describe, it, expect, vi } from 'vitest'
import { createTraceTracker, type TraceSpan } from '../src/trace-tracker'
import type { AgentEvent } from '@agentskit/core'

describe('createTraceTracker', () => {
  it('creates root span for agent:step', () => {
    const started: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: () => {},
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })

    expect(started).toHaveLength(1)
    expect(started[0].name).toBe('agentskit.agent.step')
    expect(started[0].parentId).toBeNull()
    expect(started[0].attributes['agentskit.step']).toBe(1)
  })

  it('nests llm span under agent step', () => {
    const started: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: () => {},
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 3 })

    expect(started).toHaveLength(2)
    expect(started[1].name).toBe('gen_ai.chat')
    expect(started[1].parentId).toBe(started[0].id)
    expect(started[1].attributes['agentskit.message_count']).toBe(3)
  })

  it('closes llm span on llm:end with attributes', () => {
    const ended: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: () => {},
      onSpanEnd: (s) => ended.push(s),
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 1 })
    tracker.handle({ type: 'llm:end', content: 'response', durationMs: 500 })

    expect(ended).toHaveLength(1)
    expect(ended[0].name).toBe('gen_ai.chat')
    expect(ended[0].endTime).toBeDefined()
    expect(ended[0].attributes['agentskit.duration_ms']).toBe(500)
  })

  it('adds first-token latency to llm span', () => {
    const started: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: () => {},
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 1 })
    tracker.handle({ type: 'llm:first-token', latencyMs: 150 })

    expect(started[1].attributes['gen_ai.response.first_token_ms']).toBe(150)
  })

  it('nests tool span under agent step', () => {
    const started: TraceSpan[] = []
    const ended: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: (s) => ended.push(s),
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'tool:start', name: 'web_search', args: { q: 'test' } })

    expect(started[1].name).toBe('agentskit.tool.web_search')
    expect(started[1].parentId).toBe(started[0].id)

    tracker.handle({ type: 'tool:end', name: 'web_search', result: 'found', durationMs: 200 })

    expect(ended).toHaveLength(1)
    expect(ended[0].attributes['agentskit.duration_ms']).toBe(200)
  })

  it('handles memory events as instant spans', () => {
    const started: TraceSpan[] = []
    const ended: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: (s) => ended.push(s),
    })

    tracker.handle({ type: 'memory:load', messageCount: 5 })

    expect(started).toHaveLength(1)
    expect(ended).toHaveLength(1)
    expect(started[0].name).toBe('agentskit.memory.load')
  })

  it('marks span as error on error event', () => {
    const started: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: () => {},
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 1 })
    tracker.handle({ type: 'error', error: new Error('timeout') })

    expect(started[1].status).toBe('error')
    expect(started[1].attributes['error.message']).toBe('timeout')
  })

  it('flush closes all open spans', () => {
    const ended: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: () => {},
      onSpanEnd: (s) => ended.push(s),
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 1 })
    // Don't send llm:end — flush should close everything

    tracker.flush()

    // LLM span + step span should both be closed
    expect(ended.length).toBeGreaterThanOrEqual(2)
  })

  it('full trace: step → llm → tool → llm → done', () => {
    const started: TraceSpan[] = []
    const ended: TraceSpan[] = []
    const tracker = createTraceTracker({
      onSpanStart: (s) => started.push(s),
      onSpanEnd: (s) => ended.push(s),
    })

    tracker.handle({ type: 'agent:step', step: 1, action: 'initial' })
    tracker.handle({ type: 'llm:start', messageCount: 2 })
    tracker.handle({ type: 'llm:end', content: 'let me search', durationMs: 300 })
    tracker.handle({ type: 'tool:start', name: 'search', args: { q: 'test' } })
    tracker.handle({ type: 'tool:end', name: 'search', result: 'found', durationMs: 150 })
    tracker.handle({ type: 'agent:step', step: 2, action: 'tool-result-loop' })
    tracker.handle({ type: 'llm:start', messageCount: 4 })
    tracker.handle({ type: 'llm:end', content: 'here is the answer', durationMs: 400 })

    // Started: step1, llm1, tool, step2(closes step1), llm2
    expect(started.length).toBeGreaterThanOrEqual(5)
    // Ended: llm1, tool, step1, llm2
    expect(ended.length).toBeGreaterThanOrEqual(4)
  })
})
