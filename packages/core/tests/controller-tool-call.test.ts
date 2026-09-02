import { describe, expect, it, vi } from 'vitest'
import { createEventEmitter } from '../src/primitives'
import { handleControllerToolCall } from '../src/controller-tool-call'

const correlation = { operationId: 'op-test', runId: 'run-test' }

function context(overrides: Record<string, unknown> = {}) {
  const emitter = createEventEmitter()
  return {
    assistantId: 'assistant',
    chunk: { type: 'tool_call', toolCall: { id: 'call', name: 'write', args: '{}' } },
    isCurrentGeneration: () => true,
    toolMap: new Map(),
    messages: [],
    onToolCall: undefined,
    authorize: async () => ({ allowed: true }),
    emitter,
    setMessage: vi.fn(),
    patchCall: vi.fn(),
    runTool: vi.fn(async () => ({ status: 'complete' as const, result: 'ok' })),
    correlation,
    registerToolCall: vi.fn(),
    ...overrides,
  }
}

describe('handleControllerToolCall', () => {
  it('completes a confirmed call when the adapter already supplied a result', async () => {
    const patchCall = vi.fn()
    const tool = { name: 'write', requiresConfirmation: true, execute: vi.fn() }
    await handleControllerToolCall(context({
      toolMap: new Map([['write', tool]]),
      patchCall,
      chunk: { type: 'tool_call', toolCall: { id: 'call', name: 'write', args: '{}', result: 'done' } },
    }))

    expect(patchCall).toHaveBeenCalledWith('assistant', 'call', { result: 'done', status: 'complete' })
    expect(tool.execute).not.toHaveBeenCalled()
  })

  it('forwards executable partial output and final status', async () => {
    const patchCall = vi.fn()
    const runTool = vi.fn(async (_tool, _call, onPartial) => {
      onPartial('partial')
      return { status: 'complete' as const, result: 'done' }
    })
    await handleControllerToolCall(context({ patchCall, runTool }))

    expect(patchCall).toHaveBeenCalledWith('assistant', 'call', { result: 'partial' })
    expect(patchCall).toHaveBeenLastCalledWith('assistant', 'call', { status: 'complete', result: 'done', error: undefined })
  })

  it('does not finalize a call superseded while the tool is running', async () => {
    const patchCall = vi.fn()
    const isCurrentGeneration = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false)
    await handleControllerToolCall(context({
      isCurrentGeneration,
      patchCall,
      toolMap: new Map([['write', { name: 'write', execute: vi.fn() }]]),
    }))

    expect(patchCall).toHaveBeenCalledWith('assistant', 'call', { status: 'running' })
    expect(patchCall).not.toHaveBeenCalledWith('assistant', 'call', expect.objectContaining({ status: 'complete' }))
  })
})
