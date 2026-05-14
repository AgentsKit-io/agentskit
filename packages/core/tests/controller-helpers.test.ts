import { describe, it, expect } from 'vitest'
import { mergeSystemMessages, buildRetrievalMessage } from '../src/controller-helpers'
import type { Message } from '../src/types'

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
