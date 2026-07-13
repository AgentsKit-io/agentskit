import { describe, it, expect, vi } from 'vitest'
import { createChatController } from '../src/controller'
import { proposeToolCall } from '../src/tool-proposal'
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
  it('authorizes application proposals and reauthorizes before execution', async () => {
    let allowed = true
    const execute = vi.fn()
    const authorizeToolCall = vi.fn((_call, context) => ({ allowed, reason: `denied at ${context.phase}` }))
    const ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute }],
      authorizeToolCall,
    })
    const proposal = { id: 'authorized-then-revoked', name: 'write', args: {} }
    await proposeToolCall(ctrl, proposal)
    allowed = false
    await ctrl.approve(proposal.id)

    expect(authorizeToolCall.mock.calls.map(([, context]) => context.phase)).toEqual(['propose', 'execute'])
    expect(execute).not.toHaveBeenCalled()
    expect(ctrl.getState().messages[0].toolCalls?.[0]).toMatchObject({ status: 'error', error: expect.stringContaining('denied at execute') })
  })

  it('refuses unauthorized application and model proposals before commit', async () => {
    const authorizeToolCall = vi.fn(() => ({ allowed: false, reason: 'not allowed' }))
    const tool = { name: 'write', requiresConfirmation: true, execute: vi.fn() }
    const app = createTestController({ tools: [tool], authorizeToolCall })
    await expect(proposeToolCall(app, { id: 'denied-app', name: 'write', args: {} })).rejects.toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    expect(app.getState().messages).toEqual([])

    const model = createChatController({
      adapter: createMockAdapter([
        { type: 'tool_call', toolCall: { id: 'denied-model', name: 'write', args: '{}' } },
        { type: 'done' },
      ]),
      tools: [tool],
      authorizeToolCall,
    })
    await model.send('forge capability=write')
    expect(model.getState().messages.flatMap(message => message.toolCalls ?? [])).toEqual([])
    expect(model.getState().error).toMatchObject({ code: 'AK_TOOL_FORBIDDEN' })
    expect(tool.execute).not.toHaveBeenCalled()
  })

  it('rechecks the current authorizer when policy changes during authorization', async () => {
    let release = () => undefined
    let executing = () => undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    const started = new Promise<void>(resolve => { executing = resolve })
    const execute = vi.fn()
    const authorizeToolCall = vi.fn(async (_call, context) => {
      if (context.phase === 'execute') { executing(); await blocked }
      return { allowed: true }
    })
    const ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute }], authorizeToolCall,
    })
    await proposeToolCall(ctrl, { id: 'revoked-during-check', name: 'write', args: {} })
    const approval = ctrl.approve('revoked-during-check')
    await started
    ctrl.updateConfig({ authorizeToolCall: () => ({ allowed: false, reason: 'revoked' }) })
    release()
    await approval
    expect(execute).not.toHaveBeenCalled()
    expect(ctrl.getState().messages[0].toolCalls?.[0]).toMatchObject({ status: 'error', error: expect.stringContaining('not authorized') })
  })

  it('fails closed when the tool registry changes during authorization', async () => {
    let release = () => undefined
    let executing = () => undefined
    const blocked = new Promise<void>(resolve => { release = resolve })
    const started = new Promise<void>(resolve => { executing = resolve })
    const execute = vi.fn()
    const authorizeToolCall = vi.fn(async (_call, context) => {
      if (context.phase === 'execute') { executing(); await blocked }
      return { allowed: true }
    })
    const ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute }], authorizeToolCall,
    })
    await proposeToolCall(ctrl, { id: 'removed-during-check', name: 'write', args: {} })
    const approval = ctrl.approve('removed-during-check')
    await started
    ctrl.updateConfig({ tools: [] })
    release()
    await approval
    expect(execute).not.toHaveBeenCalled()
  })

  it('observes a policy added as approval begins', async () => {
    const execute = vi.fn()
    const ctrl = createTestController({ tools: [{ name: 'write', requiresConfirmation: true, execute }] })
    await proposeToolCall(ctrl, { id: 'policy-added', name: 'write', args: {} })
    const approval = ctrl.approve('policy-added')
    ctrl.updateConfig({ authorizeToolCall: () => ({ allowed: false, reason: 'new policy' }) })
    await approval
    expect(execute).not.toHaveBeenCalled()
  })

  it('defaults authorizer failures to deny', async () => {
    const ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute: vi.fn() }],
      authorizeToolCall: () => { throw new Error('secret policy failure') },
    })
    await expect(proposeToolCall(ctrl, { id: 'policy-failed', name: 'write', args: {} })).rejects.toMatchObject({
      code: 'AK_TOOL_FORBIDDEN', message: 'Tool "write" is not authorized',
    })
  })

  it('makes a proposal non-executable when onToolCall rejects', async () => {
    const onToolCall = vi.fn().mockRejectedValue(new Error('policy denied'))
    const execute = vi.fn()
    const ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute }],
      onToolCall,
    })
    const proposal = { id: 'policy-denied', name: 'write', args: {} }

    await expect(proposeToolCall(ctrl, proposal)).rejects.toThrow('policy denied')
    expect(ctrl.getState().messages[0].toolCalls?.[0]).toMatchObject({ status: 'error', error: 'policy denied' })
    await expect(proposeToolCall(ctrl, proposal)).resolves.toMatchObject({ id: proposal.id, status: 'error' })
    expect(onToolCall).toHaveBeenCalledOnce()
    await ctrl.approve(proposal.id)
    expect(execute).not.toHaveBeenCalled()
  })

  it('deduplicates concurrent and reentrant proposals before the hook', async () => {
    let ctrl: ReturnType<typeof createTestController>
    const proposal = { id: 'same-id', name: 'write', args: {} }
    const onToolCall = vi.fn(async () => {
      await expect(proposeToolCall(ctrl, proposal)).resolves.toMatchObject({ id: proposal.id })
    })
    ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute: vi.fn() }],
      onToolCall,
    })

    const calls = await Promise.all([proposeToolCall(ctrl, proposal), proposeToolCall(ctrl, proposal)])
    expect(calls[0]).toEqual(calls[1])
    expect(onToolCall).toHaveBeenCalledOnce()
    expect(ctrl.getState().messages.flatMap(message => message.toolCalls ?? [])).toHaveLength(1)
  })

  it('proposes a validated confirmed tool call without executing it', async () => {
    const execute = vi.fn(() => 'sent')
    const onToolCall = vi.fn()
    const config: ChatConfig = {
      adapter: createMockAdapter([]),
      tools: [{
        name: 'send-email', requiresConfirmation: true, execute,
        schema: { type: 'object', properties: { to: { type: 'string' } }, required: ['to'] },
      }],
      validateArgs: (_schema, args) => ({ valid: typeof args.to === 'string' }),
      onToolCall,
    }
    const ctrl = createChatController(config)
    const proposal = { id: 'app-call-1', name: 'send-email', args: { to: 'ada@example.com' } }
    const first = await proposeToolCall(ctrl, proposal)
    const cyclicReplay: Record<string, unknown> = {}
    cyclicReplay.self = cyclicReplay
    const replay = await proposeToolCall(ctrl, { id: proposal.id, name: '', args: cyclicReplay })

    expect(first).toEqual({ ...proposal, status: 'requires_confirmation' })
    expect(replay).toEqual(first)
    expect(ctrl.getState().messages.at(-1)?.toolCalls).toEqual([first])
    expect(execute).not.toHaveBeenCalled()
    expect(onToolCall).toHaveBeenCalledOnce()

    await ctrl.approve(proposal.id)
    await ctrl.approve(proposal.id)
    expect(execute).toHaveBeenCalledOnce()
  })

  it('denies an application proposal without executing it', async () => {
    const execute = vi.fn()
    const ctrl = createTestController({
      tools: [{ name: 'delete-record', requiresConfirmation: true, execute }],
    })
    await proposeToolCall(ctrl, { id: 'app-call-denied', name: 'delete-record', args: { id: 'record-1' } })
    await ctrl.deny('app-call-denied', 'not now')
    await ctrl.approve('app-call-denied')
    expect(execute).not.toHaveBeenCalled()
    expect(ctrl.getState().messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === 'app-call-denied')).toMatchObject({ status: 'error' })
  })

  it('rejects invalid, missing, and non-confirmed application proposals', async () => {
    const config: ChatConfig = {
      adapter: createMockAdapter([]),
      tools: [
        { name: 'confirmed', requiresConfirmation: true, execute: () => undefined, schema: { type: 'object' } },
        { name: 'immediate', execute: () => undefined },
      ],
      validateArgs: (_schema, args) => ({ valid: args.valid === true, message: 'invalid app args' }),
    }
    const ctrl = createChatController(config)
    await expect(proposeToolCall(ctrl, { id: 'missing', name: 'missing', args: {} })).rejects.toMatchObject({ code: 'AK_TOOL_NOT_FOUND' })
    await expect(proposeToolCall(ctrl, { id: 'immediate', name: 'immediate', args: {} })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    await expect(proposeToolCall(ctrl, { id: 'invalid', name: 'confirmed', args: {} })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    await expect(proposeToolCall(ctrl, { id: '', name: 'confirmed', args: {} })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    await expect(proposeToolCall(ctrl, { id: 'cyclic', name: 'confirmed', args: cyclic })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error('blocked') } })
    await expect(proposeToolCall(ctrl, { id: 'hostile', name: 'confirmed', args: hostile })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    await expect(proposeToolCall(ctrl, { id: 'large', name: 'confirmed', args: { value: 'x'.repeat(16_385) } })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    await expect(proposeToolCall(ctrl, { id: 'sparse', name: 'confirmed', args: { value: new Array(10_001) } })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    const accessor = {}
    Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 'unsafe' })
    await expect(proposeToolCall(ctrl, { id: 'accessor', name: 'confirmed', args: accessor })).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    expect(ctrl.getState().messages).toEqual([])
  })

  it('uses the controller current config as the only proposal authority', async () => {
    const execute = vi.fn()
    const ctrl = createTestController({
      tools: [{ name: 'write', requiresConfirmation: true, execute }],
    })
    ctrl.updateConfig({ tools: [{ name: 'write', execute }] })
    await expect(proposeToolCall(ctrl, { id: 'write-1', name: 'write', args: {} })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    expect(ctrl.getState().messages).toEqual([])
  })

  it('snapshots proposal args before confirmation', async () => {
    const execute = vi.fn()
    const config: ChatConfig = { adapter: createMockAdapter([]), tools: [{ name: 'write', requiresConfirmation: true, execute }] }
    const ctrl = createChatController(config)
    const args = { value: 'original' }
    await proposeToolCall(ctrl, { id: 'write-snapshot', name: 'write', args })
    args.value = 'mutated'
    await ctrl.approve('write-snapshot')
    expect(execute).toHaveBeenCalledWith({ value: 'original' }, expect.anything())
  })

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
    const memory = createInMemoryMemory()
    const ctrl = createChatController({
      memory,
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
    expect(ctrl.getState().messages.at(-1)?.status).toBe('complete')
    await vi.waitFor(async () => expect((await memory.load()).at(-1)?.status).toBe('complete'))
    ctrl.stop()
    expect(ctrl.getState().messages.at(-1)?.status).toBe('complete')
  })

  it('stop() cancels a turn before its adapter source is created', async () => {
    let releaseRetrieval: (() => void) | undefined
    const createSource = vi.fn(() => ({
      async *stream() { yield { type: 'done' as const } },
      abort: vi.fn(),
    }))
    const ctrl = createChatController({
      adapter: { createSource },
      retriever: {
        retrieve: () => new Promise(resolve => {
          releaseRetrieval = () => resolve([])
        }),
      },
    })

    const sendPromise = ctrl.send('Go')
    await vi.waitFor(() => expect(ctrl.getState().status).toBe('streaming'))
    ctrl.stop()
    releaseRetrieval?.()
    await sendPromise

    expect(createSource).not.toHaveBeenCalled()
    expect(ctrl.getState().status).toBe('idle')
    expect(ctrl.getState().messages.at(-1)?.status).toBe('complete')
  })

  it('a stopped pre-source turn cannot mutate a later send', async () => {
    let releaseFirst: (() => void) | undefined
    let retrievalCount = 0
    const createSource = vi.fn(() => createMockAdapter([
      { type: 'text', content: 'latest' },
      { type: 'done' },
    ]).createSource({ messages: [], context: {} }))
    const ctrl = createChatController({
      adapter: { createSource },
      retriever: {
        retrieve: () => {
          retrievalCount++
          if (retrievalCount > 1) return Promise.resolve([])
          return new Promise(resolve => { releaseFirst = () => resolve([]) })
        },
      },
    })

    const firstSend = ctrl.send('first')
    await vi.waitFor(() => expect(ctrl.getState().status).toBe('streaming'))
    ctrl.stop()
    await ctrl.send('second')
    releaseFirst?.()
    await firstSend

    expect(createSource).toHaveBeenCalledOnce()
    expect(ctrl.getState().messages.at(-1)?.content).toBe('latest')
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
