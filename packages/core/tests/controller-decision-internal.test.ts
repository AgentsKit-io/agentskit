import { describe, it, expect, vi } from 'vitest'
import { createChatController, createInMemoryMemory, imagePart, filePart, textPart } from '../src/index'
import type { AdapterFactory, AdapterRequest, ToolDecisionRecord, ToolDecisionStore, ChatConfig, StreamChunk } from '../src/index'
import { createMockAdapter } from './helpers'

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function store(records = new Map<string, ToolDecisionRecord>(), atomic = true): ToolDecisionStore {
  return {
    async putPending(record) {
      if (!records.has(record.toolCallId)) records.set(record.toolCallId, copy(record))
    },
    async get(id) { return records.has(id) ? copy(records.get(id)!) : undefined },
    async claim(id, decision, reason) {
      const record = records.get(id)
      if (record?.status !== 'pending') return undefined
      await Promise.resolve()
      if (atomic && records.get(id)?.status !== 'pending') return undefined
      const claimed: ToolDecisionRecord = { ...record, status: 'claimed', decision, reason }
      records.set(id, copy(claimed))
      return copy(claimed)
    },
    async settle(record) {
      const claimed = records.get(record.toolCallId)
      if (claimed?.status !== 'claimed' || claimed.decision !== record.decision) throw new Error('No matching claim')
      records.set(record.toolCallId, copy(record))
    },
  }
}

function fixture(overrides: Partial<ChatConfig> = {}) {
  const execute = vi.fn(() => 'stored')
  const requests: AdapterRequest[] = []
  const adapter: AdapterFactory = {
    createSource(request) {
      requests.push(request)
      return createMockAdapter([{ type: 'text', content: 'Finished' }, { type: 'done' }]).createSource(request)
    },
  }
  const config: ChatConfig = { adapter, tools: [{ name: 'write', requiresConfirmation: true, execute }], decisionStore: store(), ...overrides }
  return { config, execute, requests, chat: createChatController(config) }
}

const proposal = { id: 'call-1', name: 'write', args: { value: 7 } }

describe('durable controller decisions', () => {
  it('continues an auto-run turn despite an older undecided confirmation', async () => {
    const requests: AdapterRequest[] = []
    const weather = vi.fn(() => 'sunny')
    const { config } = fixture({ tools: [
      { name: 'write', requiresConfirmation: true, execute: () => 'stored' },
      { name: 'weather', execute: weather },
    ] })
    const chat = createChatController({ ...config, adapter: {
      createSource(request) {
        requests.push(request)
        let chunks: StreamChunk[] = [{ type: 'text', content: 'Sunny today' }]
        if (requests.length === 1) chunks = [{ type: 'tool_call', toolCall: { ...proposal, args: '{}' } }]
        if (requests.length === 2) chunks = [{ type: 'tool_call', toolCall: { id: 'weather', name: 'weather', args: '{}' } }]
        return createMockAdapter([...chunks, { type: 'done' }]).createSource(request)
      },
    } })
    await chat.send('write')
    await chat.send('weather?')
    expect(requests).toHaveLength(3)
    expect(weather).toHaveBeenCalledTimes(1)
    expect(chat.getState().messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === proposal.id)?.status).toBe('requires_confirmation')
    expect(requests[2].messages.find(message => message.toolCallId === 'weather')?.content).toBe('sunny')
    expect(chat.getState().messages.at(-1)?.content).toBe('Sunny today')
  })

  it('resumes the latest decision despite a running call from a superseded generation', async () => {
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    const { config, requests } = fixture({ tools: [
      { name: 'write', requiresConfirmation: true, execute: () => 'stored' },
      { name: 'slow', execute: async () => { await gate; return 'old result' } },
    ] })
    const chat = createChatController({ ...config, adapter: createMockAdapter([
      { type: 'tool_call', toolCall: { id: 'old-running', name: 'slow', args: '{}' } }, { type: 'done' },
    ]) })
    const sending = chat.send('slow')
    await vi.waitUntil(() => chat.getState().messages.at(-1)?.toolCalls?.[0].status === 'running')
    chat.updateConfig({ adapter: config.adapter })
    try {
      await chat.send('later')
      await chat.proposeToolCall(proposal)
      await chat.decide(proposal.id, 'approve')
      expect(requests).toHaveLength(2)
      expect(requests[1].messages.find(message => message.toolCallId === proposal.id)?.content).toBe('stored')
      expect(requests[1].correlation?.runId).not.toBe(requests[0].correlation?.runId)
      expect(chat.getState().messages.at(-1)?.content).toBe('Finished')
    } finally { release(); await sending }
  })

  it.each(['decide', 'approve', 'deny'] as const)('allows %s after a single pending-registration save failure', async action => {
    const memory = createInMemoryMemory()
    const onError = vi.fn()
    const { chat, config, execute } = fixture({ memory, onError })
    await chat.proposeToolCall(proposal)
    const save = memory.save.bind(memory)
    memory.save = vi.fn().mockRejectedValueOnce(new Error('offline once')).mockImplementation(save)
    chat.updateConfig({ adapter: createMockAdapter([
      { type: 'tool_call', toolCall: { ...proposal, id: 'failed-arrival', args: '{}' } }, { type: 'done' },
    ]) })
    await chat.send('another write')
    expect(chat.getState().error).toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'AK_MEMORY_SAVE_FAILED' }))
    expect(await config.decisionStore!.get('failed-arrival')).toBeUndefined()
    if (action === 'decide') await chat.decide(proposal.id, 'approve')
    else await chat[action](proposal.id)
    expect(execute).toHaveBeenCalledTimes(action === 'deny' ? 0 : 1)
    expect(await config.decisionStore!.get(proposal.id)).toMatchObject({ status: action === 'deny' ? 'denied' : 'complete' })
    expect(await memory.load()).toEqual(chat.getState().messages)
  })

  it('completes a persisted streaming assistant after restart and resumes in call order', async () => {
    const memory = createInMemoryMemory()
    const { config, requests, execute } = fixture({ memory })
    const messages = [{ id: 'user', role: 'user' as const, content: 'write twice', createdAt: 1 }, {
      id: 'interrupted', role: 'assistant' as const, content: 'partial', createdAt: 2, status: 'streaming' as const,
      toolCalls: [
        { ...proposal, status: 'requires_confirmation' as const },
        { ...proposal, id: 'call-2', status: 'requires_confirmation' as const },
      ],
    }]
    await memory.save(messages)
    for (const call of messages[1].toolCalls!) await config.decisionStore!.putPending({ toolCallId: call.id, status: 'pending', messages })
    const restarted = createChatController(config)
    await restarted.decide('call-2', 'approve')
    expect(requests).toHaveLength(0)
    await restarted.decide(proposal.id, 'approve')
    expect(execute).toHaveBeenCalledTimes(2)
    expect(requests).toHaveLength(1)
    expect(requests[0].messages.map(message => message.role)).toEqual(['user', 'assistant', 'tool', 'tool', 'assistant'])
    expect(requests[0].messages.filter(message => message.role === 'tool').map(message => [message.toolCallId, message.content])).toEqual([[proposal.id, 'stored'], ['call-2', 'stored']])
    expect(restarted.getState().messages.at(-1)?.content).toBe('Finished')
    expect(await memory.load()).toEqual(restarted.getState().messages)
  })

  it('replays a denial with a different reason without replacing the recorded reason', async () => {
    const { chat, config, execute, requests } = fixture()
    await chat.proposeToolCall(proposal)
    const first = await chat.decide(proposal.id, 'deny', 'original')
    expect(await chat.decide(proposal.id, 'deny', 'different')).toEqual(first)
    expect(await config.decisionStore!.get(proposal.id)).toMatchObject({ reason: 'original' })
    expect(execute).not.toHaveBeenCalled()
    expect(requests).toHaveLength(1)
  })

  it.each([[false, true], [true, true], [false, false]])('preserves later turns when restarted=%s, memory=%s', async (restarted, persisted) => {
    const memory = persisted ? createInMemoryMemory() : undefined
    const { chat, config } = fixture({ memory })
    await chat.proposeToolCall(proposal)
    await chat.send('later message')
    const before = copy(chat.getState().messages)
    const current = restarted ? createChatController(config) : chat
    await current.decide(proposal.id, 'approve')
    const messages = current.getState().messages
    expect(messages.filter(message => message.role !== 'tool').slice(0, before.length).map(m => [m.id, m.content])).toEqual(before.map(m => [m.id, m.content]))
    expect(messages[0].toolCalls?.[0].status).toBe('complete')
    expect(messages.at(-1)?.content).toBe('Finished')
    if (memory) expect(await memory.load()).toEqual(messages)
  })

  it('does not resume an older call while a later confirmation waits', async () => {
    const { chat, requests } = fixture()
    await chat.proposeToolCall(proposal)
    await chat.send('later')
    await chat.proposeToolCall({ ...proposal, id: 'later-call' })
    const before = requests.length
    await chat.decide(proposal.id, 'approve')
    expect(requests).toHaveLength(before)
    expect(chat.getState().messages[1]).toMatchObject({ role: 'tool', toolCallId: proposal.id, content: 'stored' })
    expect(chat.getState().messages.at(-1)?.toolCalls?.[0].status).toBe('requires_confirmation')
    await chat.decide('later-call', 'deny')
    expect(requests).toHaveLength(before + 1)
    const messages = requests.at(-1)!.messages
    for (let index = 0; index < messages.length; index++) {
      const calls = messages[index].toolCalls ?? []
      expect(messages.slice(index + 1, index + 1 + calls.length).map(message => message.toolCallId)).toEqual(calls.map(call => call.id))
    }
  })

  it.each(['approve', 'deny'] as const)('registers streamed calls before %s and accepts identical double clicks', async action => {
    const { config, execute, requests } = fixture()
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    let arrived = false
    const chat = createChatController({ ...config, adapter: {
      createSource(request) {
        if (request.messages.some(message => message.role === 'tool')) return config.adapter.createSource(request)
        return {
          async *stream() {
            yield { type: 'tool_call' as const, toolCall: { ...proposal, args: '{}' } }
            arrived = true
            await gate
            yield { type: 'tool_call' as const, toolCall: { ...proposal, id: 'call-2', args: '{}' } }
            yield { type: 'done' as const }
          },
          abort: vi.fn(release),
        }
      },
    }, onToolCall: async call => { await Promise.all([chat[action](call.id), chat[action](call.id)]) } })
    const sending = chat.send('write twice')
    try {
      await vi.waitUntil(() => arrived)
      expect(requests).toHaveLength(0)
      expect((await config.decisionStore!.get(proposal.id))?.decision).toBe(action)
    } finally { release() }
    await sending
    expect(requests).toHaveLength(1)
    expect(requests[0].messages.filter(message => message.role === 'tool').map(message => message.toolCallId)).toEqual([proposal.id, 'call-2'])
    expect(execute).toHaveBeenCalledTimes(action === 'approve' ? 2 : 0)
  })

  it('does not abort a live stream when the claimed target is no longer pending', async () => {
    const { chat, config, execute } = fixture()
    await chat.proposeToolCall(proposal)
    let releaseClaim = () => {}
    let claimed = false
    const claimGate = new Promise<void>(resolve => { releaseClaim = resolve })
    const claim = config.decisionStore!.claim.bind(config.decisionStore)
    config.decisionStore!.claim = async (...args) => { const record = await claim(...args); claimed = true; await claimGate; return record }
    const deciding = chat.decide(proposal.id, 'approve')
    const rejected = expect(deciding).rejects.toMatchObject({ code: 'AK_ACTION_ALREADY_DECIDED' })
    await vi.waitUntil(() => claimed)
    let releaseStream = () => {}
    const gate = new Promise<void>(resolve => { releaseStream = resolve })
    const abort = vi.fn(releaseStream)
    chat.updateConfig({ adapter: { createSource: () => ({
      async *stream() { yield { type: 'text' as const, content: 'early' }; await gate; yield { type: 'text' as const, content: ' late' }; yield { type: 'done' as const } },
      abort,
    }) } })
    const sending = chat.send('later')
    await vi.waitUntil(() => chat.getState().messages.at(-1)?.content === 'early')
    chat.setMessages(chat.getState().messages.slice(1))
    releaseClaim()
    await rejected
    expect(abort).not.toHaveBeenCalled()
    expect(chat.getState().status).toBe('streaming')
    releaseStream()
    await sending
    expect(chat.getState().messages.at(-1)?.content).toBe('early late')
    expect(execute).not.toHaveBeenCalled()
  })

  it('orders mixed decisions made in reverse order and avoids duplicate results', async () => {
    const { config, requests, execute } = fixture()
    const chat = createChatController({ ...config, adapter: {
      createSource(request) {
        if (request.messages.some(message => message.role === 'tool')) return config.adapter.createSource(request)
        return createMockAdapter([
          { type: 'tool_call', toolCall: { ...proposal, args: '{}' } },
          { type: 'tool_call', toolCall: { ...proposal, id: 'call-2', args: '{}' } }, { type: 'done' },
        ]).createSource(request)
      },
    } })
    await chat.send('write twice')
    await chat.decide('call-2', 'approve')
    expect(requests).toHaveLength(0)
    await chat.decide(proposal.id, 'deny', 'cancelled')
    expect(requests).toHaveLength(1)
    const messages = requests[0].messages
    const index = messages.findIndex(message => message.toolCalls?.length === 2)
    expect(messages.slice(index + 1, index + 3).map(message => [message.toolCallId, message.content])).toEqual([
      [proposal.id, 'Permission denied: cancelled'], ['call-2', 'stored'],
    ])
    await chat.send('next')
    const tools = requests.at(-1)!.messages.filter(message => message.role === 'tool')
    expect(tools.map(message => message.toolCallId)).toEqual([proposal.id, 'call-2'])
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('allows subscriber approval while arrival persistence is still saving', async () => {
    const memory = createInMemoryMemory()
    const save = memory.save.bind(memory)
    let release = () => {}
    const gate = new Promise<void>(resolve => { release = resolve })
    memory.save = async messages => { await gate; await save(messages) }
    const { config, requests, execute } = fixture({ memory })
    const chat = createChatController({ ...config, adapter: {
      createSource(request) {
        return request.messages.some(message => message.role === 'tool')
          ? config.adapter.createSource(request)
          : createMockAdapter([{ type: 'tool_call', toolCall: { ...proposal, args: '{}' } }, { type: 'done' }]).createSource(request)
      },
    } })
    let approving: Promise<void> | undefined
    const unsubscribe = chat.subscribe(() => {
      if (!approving && chat.getState().messages.some(message => message.toolCalls?.some(call => call.id === proposal.id))) {
        approving = chat.approve(proposal.id)
      }
    })
    const sending = chat.send('write')
    await vi.waitUntil(() => approving !== undefined)
    release()
    await Promise.all([sending, approving])
    unsubscribe()
    expect(execute).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(1)
  })

  it('detects a non-atomic read/await/write claim', async () => {
    const port = store(new Map(), false)
    await port.putPending({ toolCallId: 'id', messages: [], status: 'pending' })
    const claims = await Promise.all(Array.from({ length: 100 }, () => port.claim('id', 'approve')))
    expect(claims.filter(Boolean)).toHaveLength(100)
  })

  it('resumes after JSON serialization and reconstruction of both controller and store', async () => {
    const records = new Map<string, ToolDecisionRecord>()
    const memory = createInMemoryMemory()
    const { chat, config, execute, requests } = fixture({ decisionStore: store(records), memory })
    await chat.proposeToolCall(proposal)
    expect((await memory.load())[0].toolCalls?.[0].status).toBe('requires_confirmation')
    const restarted = createChatController({ ...config, memory: undefined, decisionStore: store(new Map(copy([...records]))) })
    expect(await restarted.decide(proposal.id, 'approve')).toMatchObject({ status: 'complete', result: 'stored' })
    expect(execute).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(1)
    expect(requests[0].messages.find(m => m.role === 'tool')).toMatchObject({ toolCallId: proposal.id, content: 'stored' })
    expect(restarted.getState().messages.at(-1)?.content).toBe('Finished')
    await restarted.decide(proposal.id, 'approve')
    expect(execute).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(1)
  })

  it('preserves an unsaved user turn and partial response during streaming', async () => {
    const memory = createInMemoryMemory()
    const { chat, config, execute } = fixture({ memory })
    await chat.proposeToolCall(proposal)
    let release = () => {}
    let started = false
    const pending = new Promise<void>(resolve => { release = resolve })
    chat.updateConfig({ adapter: {
      createSource(request) {
        if (request.messages.some(message => message.role === 'tool')) return config.adapter.createSource(request)
        return {
          async *stream() {
            yield { type: 'text' as const, content: 'partial response' }
            started = true
            await pending
            yield { type: 'done' as const }
          },
          abort: release,
        }
      },
    } })
    const sending = chat.send('later')
    await vi.waitUntil(() => started)
    const before = copy(chat.getState().messages)
    await chat.decide(proposal.id, 'approve')
    expect(chat.getState().status).toBe('streaming')
    release()
    await sending
    const messages = chat.getState().messages
    expect(messages.filter(message => message.role !== 'tool').slice(0, before.length).map(message => [message.id, message.content])).toEqual(before.map(message => [message.id, message.content]))
    expect(messages[0].toolCalls?.[0]).toMatchObject({ status: 'complete', result: 'stored' })
    expect(messages.at(-1)?.content).toBe('partial response')
    expect(await memory.load()).toEqual(messages)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it.each(['get', 'claim'] as const)('preserves chunks, new sends and confirmations while %s is suspended', async phase => {
    const memory = createInMemoryMemory()
    const { chat, config, execute } = fixture({ memory })
    await chat.proposeToolCall(proposal)
    await chat.proposeToolCall({ ...proposal, id: 'sibling' })
    let releaseStore = () => {}
    let releaseChunk = () => {}
    let releaseStream = () => {}
    const storeGate = new Promise<void>(resolve => { releaseStore = resolve })
    const chunkGate = new Promise<void>(resolve => { releaseChunk = resolve })
    const streamGate = new Promise<void>(resolve => { releaseStream = resolve })
    let held = false
    const port = config.decisionStore!
    if (phase === 'get') {
      const get = port.get.bind(port)
      port.get = async id => {
        if (id === 'sibling') { held = true; await storeGate }
        return get(id)
      }
    } else {
      const claim = port.claim.bind(port)
      port.claim = async (...args) => { const record = await claim(...args); held = true; await storeGate; return record }
    }
    let streams = 0
    chat.updateConfig({ adapter: {
      createSource(request) {
        if (streams > 1) return config.adapter.createSource(request)
        if (streams++ === 1) return createMockAdapter([
          { type: 'tool_call', toolCall: { ...proposal, id: 'new-call', args: '{}' } }, { type: 'done' },
        ]).createSource(request)
        return {
          async *stream() {
            yield { type: 'text' as const, content: 'early' }
            await chunkGate
            yield { type: 'text' as const, content: ' late' }
            await streamGate
            yield { type: 'done' as const }
          },
          abort: releaseStream,
        }
      },
    } })
    const streaming = chat.send('streaming turn')
    await vi.waitUntil(() => chat.getState().messages.at(-1)?.content === 'early')
    const deciding = chat.decide(proposal.id, 'approve')
    await vi.waitUntil(() => held)
    releaseChunk()
    await vi.waitUntil(() => chat.getState().messages.at(-1)?.content === 'early late')
    await chat.send('new turn')
    await streaming
    const before = copy(chat.getState().messages)
    releaseStore()
    await deciding
    const messages = chat.getState().messages
    expect(messages.filter(message => message.role !== 'tool').slice(0, before.length).map(message => [message.id, message.content])).toEqual(before.map(message => [message.id, message.content]))
    expect(messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === 'new-call')).toMatchObject({ status: 'requires_confirmation' })
    expect(messages[0].toolCalls?.[0]).toMatchObject({ status: 'complete', result: 'stored' })
    expect(await memory.load()).toEqual(messages)
    expect((await port.get(proposal.id))?.messages).toEqual(copy(messages))
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it.each(['removed', 'complete'] as const)('settles a claim without executing when its live target becomes %s', async change => {
    const { chat, config, execute, requests } = fixture()
    await chat.proposeToolCall(proposal)
    const port = config.decisionStore!
    const claim = port.claim.bind(port)
    let release = () => {}
    let held = false
    const gate = new Promise<void>(resolve => { release = resolve })
    port.claim = async (...args) => { const record = await claim(...args); held = true; await gate; return record }
    const deciding = chat.decide(proposal.id, 'approve')
    const rejected = expect(deciding).rejects.toMatchObject({ code: 'AK_ACTION_ALREADY_DECIDED' })
    await vi.waitUntil(() => held)
    const messages = copy(chat.getState().messages)
    if (change === 'removed') chat.setMessages([])
    else {
      messages[0].toolCalls![0] = { ...messages[0].toolCalls![0], status: 'complete', result: 'already executed' }
      chat.setMessages(messages)
    }
    release()
    await rejected
    expect(chat.getState().messages).toEqual(change === 'removed' ? [] : messages)
    expect(await port.get(proposal.id)).toMatchObject({ status: 'failed', outcome: { status: 'error' } })
    expect(execute).not.toHaveBeenCalled()
    expect(requests).toHaveLength(0)
  })

  it.each(['approve', 'deny'] as const)('uses the durable claim for legacy %s racing with decide', async action => {
    const { chat, config, execute } = fixture()
    await chat.proposeToolCall(proposal)
    const claim = config.decisionStore!.claim.bind(config.decisionStore)
    let release = () => {}
    let held = false
    const gate = new Promise<void>(resolve => { release = resolve })
    config.decisionStore!.claim = async (...args) => {
      const record = await claim(...args)
      if (record) { held = true; await gate }
      return record
    }
    const deciding = chat.decide(proposal.id, 'approve')
    await vi.waitUntil(() => held)
    if (action === 'approve') await expect(chat[action](proposal.id)).resolves.toBeUndefined()
    else await expect(chat[action](proposal.id)).rejects.toMatchObject({ code: 'AK_ACTION_ALREADY_DECIDED' })
    expect(execute).not.toHaveBeenCalled()
    release()
    await deciding
    expect(execute).toHaveBeenCalledTimes(1)
    expect(await config.decisionStore!.get(proposal.id)).toMatchObject({ status: 'complete' })
  })

  it('preserves live turns after a previous memory save failed', async () => {
    const memory = createInMemoryMemory()
    const save = memory.save.bind(memory)
    const { chat } = fixture({ memory })
    await chat.proposeToolCall(proposal)
    memory.save = async () => { throw new Error('save offline') }
    await chat.send('later')
    expect(chat.getState().error).toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
    const before = copy(chat.getState().messages)
    memory.save = save
    await chat.decide(proposal.id, 'approve')
    expect(chat.getState().messages.filter(message => message.role !== 'tool').slice(0, before.length).map(message => message.content)).toEqual(before.map(message => message.content))
    expect(await memory.load()).toEqual(chat.getState().messages)
  })

  it.each(['load', 'get', 'removed'] as const)('does not claim before %s validation succeeds', async failure => {
    const memory = createInMemoryMemory()
    const { chat, config, execute } = fixture({ memory })
    await chat.send('first')
    await chat.proposeToolCall(proposal)
    const claim = vi.spyOn(config.decisionStore!, 'claim')
    let current = chat
    if (failure === 'load') {
      memory.load = async () => { throw new Error('load offline') }
      current = createChatController(config)
      await expect(current.decide(proposal.id, 'approve')).rejects.toMatchObject({ code: 'AK_MEMORY_LOAD_FAILED' })
    } else if (failure === 'get') {
      const get = config.decisionStore!.get.bind(config.decisionStore)
      config.decisionStore!.get = async id => {
        if (id === 'sibling') throw new Error('get offline')
        return get(id)
      }
      const messages = copy(chat.getState().messages)
      messages.at(-1)!.toolCalls!.push({ id: 'sibling', name: 'write', args: {}, status: 'requires_confirmation' })
      chat.setMessages(messages)
      await expect(current.decide(proposal.id, 'approve')).rejects.toThrow('get offline')
    } else {
      await chat.edit(chat.getState().messages[0].id, 'edited', { regenerate: false })
      await expect(current.decide(proposal.id, 'approve')).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    }
    expect(claim).not.toHaveBeenCalled()
    expect(await config.decisionStore!.get(proposal.id)).toMatchObject({ status: 'pending' })
    expect(execute).not.toHaveBeenCalled()
  })

  it('reconciles sibling outcomes without mutating subscriber snapshots', async () => {
    const { chat, config } = fixture()
    await chat.proposeToolCall(proposal)
    await chat.proposeToolCall({ ...proposal, id: 'sibling' })
    const claimed = await config.decisionStore!.claim('sibling', 'approve')
    await config.decisionStore!.settle({ ...claimed!, status: 'complete', outcome: { id: 'sibling', name: 'write', args: {}, status: 'complete', result: 'external' } })
    const snapshot = chat.getState()
    const before = structuredClone(snapshot)
    const unsubscribe = chat.subscribe(() => { expect(snapshot).toEqual(before) })
    await chat.decide(proposal.id, 'approve')
    unsubscribe()
    expect(snapshot).toEqual(before)
    expect(chat.getState().messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === 'sibling')).toMatchObject({ status: 'complete', result: 'external' })
  })

  it('executes once for 100 identical parallel decisions across independent controllers, repeated 100 times', async () => {
    for (let round = 0; round < 100; round++) {
      const { config, chat, execute } = fixture()
      const id = `parallel-${round}`
      await chat.proposeToolCall({ ...proposal, id })
      const results = await Promise.allSettled(Array.from({ length: 100 }, () => createChatController(config).decide(id, 'approve')))
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(100)
      expect(execute).toHaveBeenCalledTimes(1)
    }
  })

  it('persists exactly one competing approve/deny decision', async () => {
    const { config, chat, execute } = fixture()
    await chat.proposeToolCall(proposal)
    const outcomes = await Promise.allSettled([
      createChatController(config).decide(proposal.id, 'deny', 'cancelled'),
      createChatController(config).decide(proposal.id, 'approve'),
    ])
    expect(outcomes[0].status).toBe('fulfilled')
    expect(outcomes[1]).toMatchObject({ status: 'rejected', reason: { code: 'AK_ACTION_ALREADY_DECIDED' } })
    expect(execute).not.toHaveBeenCalled()
    expect(await config.decisionStore?.get(proposal.id)).toMatchObject({ status: 'denied', decision: 'deny', outcome: { error: 'Permission denied: cancelled' } })
  })

  it('stores tool failure and resumes the model without retrying the side effect', async () => {
    const execute = vi.fn(() => { throw new Error('synthetic failure') })
    const { chat, config, requests } = fixture({ tools: [{ name: 'write', requiresConfirmation: true, execute }] })
    await chat.proposeToolCall(proposal)
    expect(await chat.decide(proposal.id, 'approve')).toMatchObject({ status: 'error', error: expect.stringContaining('synthetic failure') })
    expect(await config.decisionStore?.get(proposal.id)).toMatchObject({ status: 'failed' })
    expect(requests[0].messages.find(m => m.role === 'tool')?.content).toContain('synthetic failure')
    await createChatController(config).decide(proposal.id, 'approve')
    expect(execute).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(1)
  })

  it('does not rerun an indeterminate claim after a crash', async () => {
    const { config, chat, execute } = fixture()
    await chat.proposeToolCall(proposal)
    await config.decisionStore!.claim(proposal.id, 'approve')
    await expect(createChatController(config).decide(proposal.id, 'approve')).resolves.toMatchObject({ id: proposal.id })
    expect(execute).not.toHaveBeenCalled()
  })

  it('reauthorizes persisted arguments and records denied execution', async () => {
    const { config, chat, execute } = fixture()
    await chat.proposeToolCall(proposal)
    const resumed = createChatController({ ...config, authorizeToolCall: () => ({ allowed: false, reason: 'revoked' }) })
    expect(await resumed.decide(proposal.id, 'approve')).toMatchObject({ status: 'error', error: expect.stringContaining('revoked') })
    expect(execute).not.toHaveBeenCalled()
  })

  it('raises typed errors for unknown IDs, invalid decisions, and missing store while preserving legacy no-op', async () => {
    const { chat } = fixture()
    await expect(chat.decide('unknown', 'approve')).rejects.toMatchObject({ code: 'AK_ACTION_NOT_FOUND' })
    // @ts-expect-error Runtime clients can bypass the static decision union.
    await expect(chat.decide('id', 'invalid')).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    const legacy = fixture({ decisionStore: undefined }).chat
    await expect(legacy.decide('id', 'approve')).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    await expect(legacy.approve('unknown')).resolves.toBeUndefined()
  })

  it('persists model-produced pending calls and resumes them in a new controller', async () => {
    const { config, execute } = fixture({ memory: createInMemoryMemory() })
    const chat = createChatController({ ...config, adapter: createMockAdapter([
      { type: 'tool_call', toolCall: { ...proposal, args: JSON.stringify(proposal.args) } }, { type: 'done' },
    ]) })
    await chat.send('write')
    expect(await config.decisionStore?.get(proposal.id)).toMatchObject({ status: 'pending' })
    await createChatController(config).decide(proposal.id, 'approve')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('resumes a multi-call assistant only after all persisted confirmations settle', async () => {
    const { config, requests, execute } = fixture({ memory: createInMemoryMemory() })
    const chat = createChatController({ ...config, adapter: createMockAdapter([
      { type: 'tool_call', toolCall: { ...proposal, args: '{}' } },
      { type: 'tool_call', toolCall: { ...proposal, id: 'call-2', args: '{}' } }, { type: 'done' },
    ]) })
    await chat.send('write twice')
    await createChatController(config).decide(proposal.id, 'approve')
    expect(requests).toHaveLength(0)
    await createChatController(config).decide('call-2', 'approve')
    expect(execute).toHaveBeenCalledTimes(2)
    expect(requests).toHaveLength(1)
    expect(requests[0].messages.filter(m => m.role === 'tool')).toHaveLength(2)
  })

  it('rejects a streamed snapshot after restart without memory before claiming', async () => {
    const { config, execute, requests } = fixture()
    const chat = createChatController({ ...config, adapter: createMockAdapter([
      { type: 'tool_call', toolCall: { ...proposal, args: '{}' } },
      { type: 'tool_call', toolCall: { ...proposal, id: 'call-2', args: '{}' } }, { type: 'done' },
    ]) })
    await chat.send('write twice')
    await expect(createChatController(config).decide(proposal.id, 'approve')).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    expect((await config.decisionStore!.get(proposal.id))?.status).toBe('pending')
    expect(execute).not.toHaveBeenCalled()
    expect(requests).toHaveLength(0)
  })

  it('fails closed on an invalid external claim', async () => {
    const decisionStore = store()
    decisionStore.claim = async () => ({ toolCallId: 'wrong', status: 'claimed', decision: 'approve', messages: [] })
    const { chat, execute } = fixture({ decisionStore })
    await chat.proposeToolCall(proposal)
    await expect(chat.decide(proposal.id, 'approve')).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    expect(execute).not.toHaveBeenCalled()
  })

  it('propagates proposal storage failures instead of claiming durability', async () => {
    const decisionStore = store()
    decisionStore.putPending = async () => { throw new Error('storage offline') }
    const { chat } = fixture({ decisionStore })
    await expect(chat.proposeToolCall(proposal)).rejects.toThrow('storage offline')
  })

  it('leaves a failed terminal write claimed without rerunning the tool or model', async () => {
    const decisionStore = store()
    decisionStore.settle = async () => { throw new Error('terminal write failed') }
    const { chat, config, execute, requests } = fixture({ decisionStore })
    await chat.proposeToolCall(proposal)
    await expect(chat.decide(proposal.id, 'approve')).rejects.toThrow('terminal write failed')
    await expect(createChatController(config).decide(proposal.id, 'approve')).resolves.toMatchObject({ id: proposal.id })
    expect(execute).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(0)
  })

  it('rejects pending memory failures before making a proposal claimable', async () => {
    const { chat, config } = fixture({ memory: { load: async () => [], save: async () => { throw new Error('offline') } } })
    await expect(chat.proposeToolCall(proposal)).rejects.toMatchObject({ code: 'AK_MEMORY_SAVE_FAILED' })
    expect(await config.decisionStore!.get(proposal.id)).toBeUndefined()
  })

  it('enforces insert-if-absent and terminal settlement at the port', async () => {
    const port = store()
    const record: ToolDecisionRecord = { toolCallId: 'id', messages: [], status: 'pending' }
    await port.putPending(record)
    const claims = await Promise.all(Array.from({ length: 100 }, () => port.claim('id', 'approve')))
    expect(claims.filter(Boolean)).toHaveLength(1)
    await port.putPending(record)
    expect(await port.claim('id', 'approve')).toBeUndefined()
    await expect(port.settle({ ...record, decision: 'deny', status: 'denied' })).rejects.toThrow('No matching claim')
  })
})

it('sends text, image and file parts intact while preserving legacy string and empty inputs', async () => {
  const { chat, requests } = fixture()
  const parts = [textPart('Inspect'), imagePart('https://example.test/image.png'), filePart('https://example.test/file.pdf', { filename: 'file.pdf' })]
  await chat.send(parts)
  expect(requests[0].messages[0]).toMatchObject({ role: 'user', parts, content: 'Inspect\n[image: https://example.test/image.png]\n[file: file.pdf]' })
  await chat.send('legacy')
  expect(requests[1].messages.find(m => m.content === 'legacy')?.parts).toBeUndefined()
  await chat.send('  ')
  await chat.send([])
  expect(requests).toHaveLength(2)
  await chat.send([imagePart('https://example.test/image-only.png')])
  expect(requests).toHaveLength(3)
})
