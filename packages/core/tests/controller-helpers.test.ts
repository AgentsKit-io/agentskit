import { describe, it, expect } from 'vitest'
import {
  accumulateUsage,
  buildAdapterRequest,
  buildRetrievalMessage,
  buildToolContinuation,
  mapMessageById,
  mapToolCallById,
  mergeSystemMessages,
  normalizeLlmUsage,
  sameToolLifecycle,
} from '../src/controller-helpers'
import type { Message, ToolCall, ToolDefinition } from '../src/types'

const msg = (role: Message['role'], content: string): Message => ({
  id: `m-${role}-${content.slice(0, 4)}`,
  role,
  content,
  createdAt: Date.now(),
})

describe('mergeSystemMessages', () => {
  it('returns original when systemPrompt is undefined', () => {
    const messages = [msg('user', 'hi')]
    expect(mergeSystemMessages(messages)).toBe(messages)
  })

  it('returns original when prompt already present at head', () => {
    const messages = [msg('system', 'P'), msg('user', 'hi')]
    expect(mergeSystemMessages(messages, 'P')).toBe(messages)
  })

  it('returns original when prompt present at any position (no duplicate)', () => {
    const messages = [msg('user', 'hi'), msg('system', 'P')]
    const out = mergeSystemMessages(messages, 'P')
    expect(out).toBe(messages)
  })

  it('prepends prompt when absent', () => {
    const messages = [msg('user', 'hi')]
    const out = mergeSystemMessages(messages, 'P')
    expect(out).toHaveLength(2)
    expect(out[0]!.role).toBe('system')
    expect(out[0]!.content).toBe('P')
  })

  it('treats empty string as missing prompt (no inject)', () => {
    const messages = [msg('user', 'hi')]
    expect(mergeSystemMessages(messages, '')).toBe(messages)
  })
})

describe('buildRetrievalMessage', () => {
  it('returns null when documents text is empty', () => {
    expect(buildRetrievalMessage('')).toBeNull()
  })

  it('wraps docs in a system message', () => {
    const out = buildRetrievalMessage('chunk-1\nchunk-2')
    expect(out).not.toBeNull()
    expect(out!.role).toBe('system')
    expect(out!.content).toContain('chunk-1')
    expect(out!.content).toContain('retrieved context')
  })
})

describe('controller helper boundaries', () => {
  it('normalizes missing, invalid, and valid usage', () => {
    expect(normalizeLlmUsage(undefined)).toBeUndefined()
    expect(normalizeLlmUsage({ promptTokens: -1, completionTokens: Number.NaN, totalTokens: 0 })).toEqual({ promptTokens: 0, completionTokens: 0 })
    expect(normalizeLlmUsage({ promptTokens: 2, completionTokens: 3, totalTokens: 5 })).toEqual({ promptTokens: 2, completionTokens: 3 })
    expect(accumulateUsage({ promptTokens: 1, completionTokens: 2, totalTokens: 3 }, { promptTokens: -1, completionTokens: 4, totalTokens: Number.POSITIVE_INFINITY })).toEqual({ promptTokens: 1, completionTokens: 6, totalTokens: 3 })
  })

  it('maps only the requested message and nested tool call', () => {
    const call: ToolCall = { id: 'call-1', name: 'search', args: {}, status: 'pending' }
    const messages = [{ ...msg('assistant', ''), id: 'assistant-1', toolCalls: [call] }, msg('user', 'hi')]
    const updated = mapMessageById(messages, 'missing', m => ({ ...m, content: 'nope' }))
    expect(updated).toEqual(messages)
    const patched = mapToolCallById(messages, 'assistant-1', 'call-1', { status: 'complete', result: 'ok' })
    expect(patched[0]!.toolCalls![0]).toMatchObject({ status: 'complete', result: 'ok' })
    expect(mapToolCallById(messages, 'assistant-1', 'missing', { status: 'error' })).toEqual(messages)
    const assistantWithoutCalls = msg('assistant', '')
    expect(mapToolCallById([assistantWithoutCalls], assistantWithoutCalls.id, 'call-1', { status: 'error' })[0]!.toolCalls).toEqual([])
  })

  it('compares tool lifecycle identity and builds continuation messages', () => {
    const execute = async () => 'ok'
    const dispose = async () => undefined
    const previous = new Map<string, ToolDefinition>([['search', { name: 'search', execute, dispose }]])
    expect(sameToolLifecycle(previous, new Map(previous))).toBe(true)
    expect(sameToolLifecycle(previous, new Map())).toBe(false)
    expect(sameToolLifecycle(previous, new Map([['search', { name: 'search', execute: async () => 'different' }]]))).toBe(false)
    expect(sameToolLifecycle(previous, new Map([['other', { name: 'other', execute }]]))).toBe(false)

    const calls: ToolCall[] = [
      { id: 'ok', name: 'search', args: {}, status: 'complete', result: 'result' },
      { id: 'err', name: 'search', args: {}, status: 'error', error: 'failed' },
      { id: 'empty', name: 'search', args: {}, status: 'complete' },
    ]
    const out = buildToolContinuation(messagesFrom('assistant-1'), 'assistant-1', calls, init => ({
      ...msg(init.role, init.content),
      id: init.toolCallId ?? `new-${init.role}`,
      toolCallId: init.toolCallId,
      status: init.status ?? 'complete',
    }))
    expect(out.messages.map(m => m.role)).toEqual(['assistant', 'tool', 'tool', 'tool', 'assistant'])
    expect(out.messages.slice(1, 4).map(m => m.content)).toEqual(['result', 'failed', ''])
    expect(out.nextAssistantId).toBe('new-assistant')
  })

  it('builds adapter requests with and without retrieval', async () => {
    const adapter = { createSource: () => ({ stream: async function* () {}, abort: () => {} }) }
    const retriever = { retrieve: async () => [{ content: 'doc', source: 'doc.md' }] }
    const request = await buildAdapterRequest({ adapter, retriever, temperature: 0.2 }, [msg('user', 'hi')], 'question', 'system', [])
    expect(request.messages[0]!.role).toBe('system')
    expect(request.context?.metadata).toMatchObject({ retrievedDocuments: [{ content: 'doc', source: 'doc.md' }] })
    const noRetrieval = await buildAdapterRequest({ adapter, retriever }, [msg('user', 'hi')], '', undefined, [])
    expect(noRetrieval.context?.metadata).toBeUndefined()
    expect(noRetrieval.messages).toHaveLength(1)
  })
})

function messagesFrom(id: string): Message[] {
  return [{ ...msg('assistant', 'draft'), id, status: 'streaming' }]
}
