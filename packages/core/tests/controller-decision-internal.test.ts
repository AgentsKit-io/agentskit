import { describe, it, expect, vi } from 'vitest'
import { createChatController, createInMemoryMemory, imagePart, filePart, textPart } from '../src/index'
import type { AdapterFactory, AdapterRequest, ToolDecisionRecord, ToolDecisionStore, ChatConfig } from '../src/index'
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
  it.each([[false, true], [true, true], [false, false]])('preserves later turns when restarted=%s, memory=%s', async (restarted, persisted) => {
    const memory = persisted ? createInMemoryMemory() : undefined
    const { chat, config } = fixture({ memory })
    await chat.proposeToolCall(proposal)
    await chat.send('later message')
    const before = copy(chat.getState().messages)
    const current = restarted ? createChatController(config) : chat
    await current.decide(proposal.id, 'approve')
    const messages = current.getState().messages
    expect(messages.slice(0, before.length).map(m => [m.id, m.content])).toEqual(before.map(m => [m.id, m.content]))
    expect(messages[0].toolCalls?.[0].status).toBe('complete')
    expect(messages.at(-1)?.content).toBe('Finished')
    if (memory) expect(await memory.load()).toEqual(messages)
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
    await sending
    const messages = chat.getState().messages
    expect(messages.slice(0, before.length).map(message => [message.id, message.content])).toEqual(before.map(message => [message.id, message.content]))
    expect(messages[0].toolCalls?.[0]).toMatchObject({ status: 'complete', result: 'stored' })
    expect(messages.at(-1)?.content).toBe('Finished')
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
    expect(messages.slice(0, before.length).map(message => [message.id, message.content])).toEqual(before.map(message => [message.id, message.content]))
    expect(messages.flatMap(message => message.toolCalls ?? []).find(call => call.id === 'new-call')).toMatchObject({ status: 'requires_confirmation' })
    expect(messages[0].toolCalls?.[0]).toMatchObject({ status: 'complete', result: 'stored' })
    expect(await memory.load()).toEqual(messages)
    expect((await port.get(proposal.id))?.messages).toEqual(copy(messages.slice(0, before.length)))
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
    await expect(chat[action](proposal.id)).rejects.toMatchObject({ code: 'AK_ACTION_ALREADY_DECIDED' })
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
    expect(chat.getState().messages.slice(0, before.length).map(message => message.content)).toEqual(before.map(message => message.content))
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

  it('admits one of 100 parallel decisions across independent controllers, repeated 100 times', async () => {
    for (let round = 0; round < 100; round++) {
      const { config, chat, execute } = fixture()
      const id = `parallel-${round}`
      await chat.proposeToolCall({ ...proposal, id })
      const results = await Promise.allSettled(Array.from({ length: 100 }, () => createChatController(config).decide(id, 'approve')))
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
      for (const result of results) if (result.status === 'rejected') expect(result.reason.code).toBe('AK_ACTION_ALREADY_DECIDED')
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
    await expect(createChatController(config).decide(proposal.id, 'approve')).rejects.toMatchObject({ code: 'AK_ACTION_ALREADY_DECIDED' })
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
    const { config, execute } = fixture()
    const chat = createChatController({ ...config, adapter: createMockAdapter([
      { type: 'tool_call', toolCall: { ...proposal, args: JSON.stringify(proposal.args) } }, { type: 'done' },
    ]) })
    await chat.send('write')
    expect(await config.decisionStore?.get(proposal.id)).toMatchObject({ status: 'pending' })
    await createChatController(config).decide(proposal.id, 'approve')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('resumes a multi-call assistant only after all persisted confirmations settle', async () => {
    const { config, requests, execute } = fixture()
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
    await expect(createChatController(config).decide(proposal.id, 'approve')).rejects.toMatchObject({ code: 'AK_ACTION_ALREADY_DECIDED' })
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
