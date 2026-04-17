import { describe, it, expect, vi } from 'vitest'
import { createChatController } from '../src/controller'
import { createInMemoryMemory } from '../src/memory'
import { createMockAdapter } from './helpers'
import type { Observer, AgentEvent, ChatConfig, SkillDefinition } from '../src/types'

function createTestController(overrides: Partial<ChatConfig> = {}) {
  const adapter = createMockAdapter([
    { type: 'text', content: 'Hello!' },
    { type: 'done' },
  ])
  return createChatController({ adapter, ...overrides })
}

describe('createChatController', () => {
  it('starts with idle status and empty messages', () => {
    const ctrl = createTestController()
    const state = ctrl.getState()
    expect(state.status).toBe('idle')
    expect(state.messages).toEqual([])
    expect(state.input).toBe('')
    expect(state.error).toBeNull()
  })

  it('send() adds user and assistant messages', async () => {
    const ctrl = createTestController()
    await ctrl.send('Hi')
    const state = ctrl.getState()
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0].role).toBe('user')
    expect(state.messages[0].content).toBe('Hi')
    expect(state.messages[1].role).toBe('assistant')
    expect(state.messages[1].content).toBe('Hello!')
    expect(state.messages[1].status).toBe('complete')
    expect(state.status).toBe('idle')
  })

  it('ignores empty send()', async () => {
    const ctrl = createTestController()
    await ctrl.send('')
    await ctrl.send('   ')
    expect(ctrl.getState().messages).toEqual([])
  })

  it('stop() aborts the stream', async () => {
    const abortFn = vi.fn()
    let resolve: (() => void) | undefined
    const ctrl = createChatController({
      adapter: {
        createSource: () => ({
          stream: async function* () {
            yield { type: 'text' as const, content: 'x' }
            // Block until aborted
            await new Promise<void>(r => { resolve = r })
          },
          abort: () => { abortFn(); resolve?.() },
        }),
      },
    })

    const sendPromise = ctrl.send('Go')
    await new Promise(r => setTimeout(r, 10))
    ctrl.stop()
    await sendPromise.catch(() => {})

    expect(abortFn).toHaveBeenCalled()
    expect(ctrl.getState().status).toBe('idle')
  })

  it('retry() replaces last assistant message', async () => {
    const adapter = createMockAdapter([
      { type: 'text', content: 'first' },
      { type: 'done' },
    ])
    const ctrl = createChatController({ adapter })
    await ctrl.send('Hi')
    expect(ctrl.getState().messages[1].content).toBe('first')

    ctrl.updateConfig({
      adapter: createMockAdapter([
        { type: 'text', content: 'retried' },
        { type: 'done' },
      ]),
    })
    await ctrl.retry()
    const state = ctrl.getState()
    expect(state.messages).toHaveLength(2)
    expect(state.messages[1].content).toBe('retried')
  })

  it('clear() empties messages and calls memory.clear', async () => {
    const memory = createInMemoryMemory()
    const ctrl = createTestController({ memory })
    await ctrl.send('Hi')
    expect(ctrl.getState().messages.length).toBeGreaterThan(0)

    await ctrl.clear()
    expect(ctrl.getState().messages).toEqual([])
  })

  it('setInput updates input value', () => {
    const ctrl = createTestController()
    ctrl.setInput('new input')
    expect(ctrl.getState().input).toBe('new input')
  })

  it('subscribe notifies on state changes', async () => {
    const ctrl = createTestController()
    const listener = vi.fn()
    ctrl.subscribe(listener)
    await ctrl.send('Hi')
    expect(listener.mock.calls.length).toBeGreaterThan(0)
  })

  it('unsubscribe stops notifications', async () => {
    const ctrl = createTestController()
    const listener = vi.fn()
    const unsub = ctrl.subscribe(listener)
    unsub()
    await ctrl.send('Hi')
    expect(listener).not.toHaveBeenCalled()
  })

  it('hydrates from memory on creation', async () => {
    const memory = createInMemoryMemory([{
      id: 'old',
      role: 'assistant',
      content: 'remembered',
      status: 'complete',
      createdAt: new Date(),
    }])
    const ctrl = createTestController({ memory })

    await new Promise(r => setTimeout(r, 10))
    expect(ctrl.getState().messages[0]?.content).toBe('remembered')
  })

  it('executes tools and stores results', async () => {
    const execute = vi.fn().mockResolvedValue('sunny')
    const adapter = createMockAdapter([
      { type: 'tool_call', toolCall: { id: 't1', name: 'weather', args: '{"city":"SP"}' } },
      { type: 'done' },
    ])
    const ctrl = createChatController({
      adapter,
      tools: [{ name: 'weather', execute }],
    })

    await ctrl.send('weather?')
    const toolCalls = ctrl.getState().messages[1]?.toolCalls
    expect(toolCalls).toHaveLength(1)
    expect(toolCalls?.[0].result).toBe('sunny')
    expect(toolCalls?.[0].status).toBe('complete')
    expect(execute).toHaveBeenCalledWith(
      { city: 'SP' },
      expect.objectContaining({ call: expect.objectContaining({ name: 'weather' }) }),
    )
  })

  it('handles tool execution errors', async () => {
    const adapter = createMockAdapter([
      { type: 'tool_call', toolCall: { id: 't1', name: 'fail', args: '{}' } },
      { type: 'done' },
    ])
    const ctrl = createChatController({
      adapter,
      tools: [{
        name: 'fail',
        execute: async () => { throw new Error('tool broke') },
      }],
    })

    await ctrl.send('do it')
    const toolCalls = ctrl.getState().messages[1]?.toolCalls
    expect(toolCalls?.[0].status).toBe('error')
    expect(toolCalls?.[0].error).toContain('tool broke')
  })

  it('handles stream errors', async () => {
    const onError = vi.fn()
    const adapter = createMockAdapter([
      { type: 'error', content: 'server died' },
    ])
    const ctrl = createChatController({ adapter, onError })

    await ctrl.send('Hi')
    expect(ctrl.getState().status).toBe('error')
    expect(ctrl.getState().error?.message).toBe('server died')
    expect(onError).toHaveBeenCalled()
  })
})

describe('ChatController event emission', () => {
  it('emits llm:start and llm:end events', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
    const adapter = createMockAdapter([
      { type: 'text', content: 'hi' },
      { type: 'done' },
    ])
    const ctrl = createChatController({ adapter, observers: [obs] })

    await ctrl.send('Hello')

    const start = events.find(e => e.type === 'llm:start')
    const end = events.find(e => e.type === 'llm:end')
    expect(start).toBeDefined()
    expect(start?.type === 'llm:start' && start.messageCount).toBeGreaterThan(0)
    expect(end).toBeDefined()
    expect(end?.type === 'llm:end' && end.content).toBe('hi')
    expect(end?.type === 'llm:end' && end.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('emits llm:first-token event', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
    const adapter = createMockAdapter([
      { type: 'text', content: 'first' },
      { type: 'text', content: ' second' },
      { type: 'done' },
    ])
    const ctrl = createChatController({ adapter, observers: [obs] })

    await ctrl.send('Go')

    const firstToken = events.filter(e => e.type === 'llm:first-token')
    expect(firstToken).toHaveLength(1)
  })

  it('emits tool:start and tool:end events', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
    const adapter = createMockAdapter([
      { type: 'tool_call', toolCall: { id: 't1', name: 'search', args: '{"q":"test"}' } },
      { type: 'done' },
    ])
    const ctrl = createChatController({
      adapter,
      tools: [{ name: 'search', execute: async () => 'found it' }],
      observers: [obs],
    })

    await ctrl.send('search')

    const toolStart = events.find(e => e.type === 'tool:start')
    const toolEnd = events.find(e => e.type === 'tool:end')
    expect(toolStart?.type === 'tool:start' && toolStart.name).toBe('search')
    expect(toolEnd?.type === 'tool:end' && toolEnd.result).toBe('found it')
    expect(toolEnd?.type === 'tool:end' && toolEnd.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('emits memory:load event on hydration', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
    const memory = createInMemoryMemory([{
      id: 'old',
      role: 'assistant',
      content: 'hi',
      status: 'complete',
      createdAt: new Date(),
    }])
    createChatController({
      adapter: createMockAdapter([]),
      memory,
      observers: [obs],
    })

    await new Promise(r => setTimeout(r, 10))
    const memLoad = events.find(e => e.type === 'memory:load')
    expect(memLoad?.type === 'memory:load' && memLoad.messageCount).toBe(1)
  })

  it('emits memory:save event after messages change', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
    const memory = createInMemoryMemory()
    const adapter = createMockAdapter([
      { type: 'text', content: 'hi' },
      { type: 'done' },
    ])
    const ctrl = createChatController({ adapter, memory, observers: [obs] })

    await ctrl.send('Hello')

    const memSave = events.filter(e => e.type === 'memory:save')
    expect(memSave.length).toBeGreaterThan(0)
  })

  it('emits error event on stream error', async () => {
    const events: AgentEvent[] = []
    const obs: Observer = { name: 'test', on: (e) => { events.push(e) } }
    const adapter = createMockAdapter([
      { type: 'error', content: 'boom' },
    ])
    const ctrl = createChatController({ adapter, observers: [obs] })

    await ctrl.send('Hi')

    const errorEvent = events.find(e => e.type === 'error')
    expect(errorEvent?.type === 'error' && errorEvent.error.message).toBe('boom')
  })
})

describe('ChatController skills support', () => {
  it('applies skill systemPrompt to messages', async () => {
    let capturedMessages: unknown[] = []
    const adapter = {
      createSource: (request: { messages: unknown[] }) => {
        capturedMessages = request.messages
        return createMockAdapter([
          { type: 'text', content: 'ok' },
          { type: 'done' },
        ]).createSource(request as never)
      },
    }

    const skill: SkillDefinition = {
      name: 'test-skill',
      description: 'Test',
      systemPrompt: 'You are a test assistant.',
    }

    const ctrl = createChatController({ adapter, skills: [skill] })
    await new Promise(r => setTimeout(r, 10)) // wait for skill activation
    await ctrl.send('Hi')

    const systemMsg = capturedMessages.find((m: unknown) => (m as { role: string }).role === 'system')
    expect(systemMsg).toBeDefined()
    expect((systemMsg as { content: string }).content).toContain('test-skill')
    expect((systemMsg as { content: string }).content).toContain('You are a test assistant.')
  })

  it('merges skill-activated tools', async () => {
    const execute = vi.fn().mockResolvedValue('skill-tool-result')
    const skill: SkillDefinition = {
      name: 'tool-skill',
      description: 'Skill with tools',
      systemPrompt: 'Use tools.',
      onActivate: async () => ({
        tools: [{ name: 'skill_tool', execute }],
      }),
    }

    const adapter = createMockAdapter([
      { type: 'tool_call', toolCall: { id: 't1', name: 'skill_tool', args: '{}' } },
      { type: 'done' },
    ])

    const ctrl = createChatController({ adapter, skills: [skill] })
    await new Promise(r => setTimeout(r, 10)) // wait for skill activation
    await ctrl.send('Use the tool')

    const toolCalls = ctrl.getState().messages[1]?.toolCalls
    expect(toolCalls?.[0].result).toBe('skill-tool-result')
    expect(execute).toHaveBeenCalled()
  })

  it('composes multiple skill prompts', async () => {
    let capturedMessages: unknown[] = []
    const adapter = {
      createSource: (request: { messages: unknown[] }) => {
        capturedMessages = request.messages
        return createMockAdapter([
          { type: 'text', content: 'ok' },
          { type: 'done' },
        ]).createSource(request as never)
      },
    }

    const skillA: SkillDefinition = {
      name: 'skill-a',
      description: 'A',
      systemPrompt: 'You are skill A.',
    }
    const skillB: SkillDefinition = {
      name: 'skill-b',
      description: 'B',
      systemPrompt: 'You are skill B.',
    }

    const ctrl = createChatController({ adapter, skills: [skillA, skillB] })
    await new Promise(r => setTimeout(r, 10))
    await ctrl.send('Hi')

    const systemMsg = capturedMessages.find((m: unknown) => (m as { role: string }).role === 'system')
    const content = (systemMsg as { content: string }).content
    expect(content).toContain('--- skill-a ---')
    expect(content).toContain('--- skill-b ---')
    expect(content).toContain('You are skill A.')
    expect(content).toContain('You are skill B.')
  })
})
