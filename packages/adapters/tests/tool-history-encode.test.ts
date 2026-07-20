import { describe, it, expect } from 'vitest'
import type { Message } from '@agentskit/core'
import { toAnthropicMessages, toGeminiContents } from '../src/tool-history'

const base = (partial: Partial<Message> & Pick<Message, 'id' | 'role' | 'content'>): Message => ({
  status: 'complete',
  createdAt: new Date(0),
  ...partial,
})

describe('tool-history encoders', () => {
  it('skips empty assistant placeholders without producing consecutive provider roles', () => {
    const messages: Message[] = [
      base({ id: 's', role: 'system', content: 'sys' }),
      base({ id: 'u', role: 'user', content: 'hi' }),
      base({ id: 'a', role: 'assistant', content: '' }),
      base({ id: 'u2', role: 'user', content: 'again' }),
    ]
    const anth = toAnthropicMessages(messages)
    expect(anth).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'hi' },
          { type: 'text', text: 'again' },
        ],
      },
    ])
    const gem = toGeminiContents(messages)
    expect(gem).toEqual([
      { role: 'user', parts: [{ text: 'hi' }, { text: 'again' }] },
    ])
    expect(anth.some((message, index) => message.role === anth[index - 1]?.role)).toBe(false)
    expect(gem.some((message, index) => message.role === gem[index - 1]?.role)).toBe(false)
  })

  it('maps string tool args and orphan tool results are dropped', () => {
    const messages: Message[] = [
      base({ id: 'u', role: 'user', content: 'q' }),
      base({
        id: 'a',
        role: 'assistant',
        content: 'calling',
        toolCalls: [
          { id: 'c1', name: 'lookup', args: { x: 1 } as never, status: 'complete' },
        ],
      }),
      base({ id: 't-orphan', role: 'tool', content: '{}', toolCallId: 'missing' }),
      base({ id: 't', role: 'tool', content: '{"ok":true}', toolCallId: 'c1' }),
    ]
    const anth = toAnthropicMessages(messages)
    expect(anth.some(m => Array.isArray(m.content) && (m.content as Array<{ type?: string }>).some(b => b.type === 'tool_use'))).toBe(true)
    expect(anth.some(m => Array.isArray(m.content) && (m.content as Array<{ type?: string }>).some(b => b.type === 'tool_result'))).toBe(true)
    expect(anth.filter(m => Array.isArray(m.content) && (m.content as Array<{ type?: string }>).some(b => b.type === 'tool_result'))).toHaveLength(1)

    const gem = toGeminiContents(messages)
    expect(gem.some(c => c.parts.some(p => p.functionCall))).toBe(true)
    expect(gem.some(c => c.parts.some(p => p.functionResponse))).toBe(true)
    const functionCall = gem.flatMap(c => c.parts).find(p => p.functionCall)?.functionCall as { id?: string }
    const functionResponse = gem.flatMap(c => c.parts).find(p => p.functionResponse)?.functionResponse as { id?: string; response?: unknown }
    expect(functionCall.id).toBe('c1')
    expect(functionResponse.id).toBe('c1')
    expect(functionResponse.response).toEqual({ ok: true })
  })

  it('accepts object tool args for Anthropic input', () => {
    const messages: Message[] = [
      base({
        id: 'a',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'c1',
            name: 'search',
            args: { q: 'x' },
            status: 'complete',
          },
        ],
      }),
    ]
    const anth = toAnthropicMessages(messages)
    const blocks = anth[0]!.content as Array<{ type: string; input?: unknown }>
    expect(blocks[0]).toMatchObject({ type: 'tool_use', name: 'search', input: { q: 'x' } })
  })

  it('normalizes nullish and malformed tool args safely', () => {
    const messages: Message[] = [
      base({
        id: 'a',
        role: 'assistant',
        content: 'x',
        toolCalls: [
          { id: 'c1', name: 'a', args: undefined as never, status: 'complete' },
          { id: 'c2', name: 'b', args: null as never, status: 'complete' },
        ],
      }),
      base({ id: 't1', role: 'tool', content: 'not-json', toolCallId: 'c1' }),
    ]
    const anth = toAnthropicMessages(messages)
    expect(anth[0]).toBeDefined()
    const gem = toGeminiContents(messages)
    const fr = gem.find(c => c.parts.some(p => p.functionResponse))
    expect(fr).toBeDefined()
    expect((fr!.parts[0]!.functionResponse as { response: unknown }).response).toEqual({
      result: 'not-json',
    })
  })

  it('coalesces parallel tool results into one provider turn', () => {
    const messages: Message[] = [
      base({
        id: 'a',
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'c1', name: 'first', args: {}, status: 'complete' },
          { id: 'c2', name: 'second', args: {}, status: 'complete' },
        ],
      }),
      base({ id: 't1', role: 'tool', content: '{"value":1}', toolCallId: 'c1' }),
      base({ id: 't2', role: 'tool', content: '{"value":2}', toolCallId: 'c2' }),
    ]

    const anthropicTurns = toAnthropicMessages(messages).filter(message => (
      Array.isArray(message.content) &&
      message.content.some(item => (item as { type?: unknown }).type === 'tool_result')
    ))
    expect(anthropicTurns).toHaveLength(1)
    expect((anthropicTurns[0]?.content as unknown[])).toHaveLength(2)

    const geminiTurns = toGeminiContents(messages).filter(content => (
      content.parts.some(part => part.functionResponse !== undefined)
    ))
    expect(geminiTurns).toHaveLength(1)
    expect(geminiTurns[0]?.parts).toHaveLength(2)
    expect(geminiTurns[0]?.parts.map(part => (
      part.functionResponse as { id?: string }
    ).id)).toEqual(['c1', 'c2'])
  })
})
