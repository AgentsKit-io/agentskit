/**
 * @vitest-environment happy-dom
 *
 * Minimal rendering tests for ChatApp. We mock all heavy dependencies
 * (Ink, @agentskit/ink, @agentskit/runtime) so we can exercise the
 * pure logic paths inside ChatApp without a real terminal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// renderChatHeader — covered by chat-app-utils.test.ts, add edge cases here
// ---------------------------------------------------------------------------

describe('renderChatHeader edge cases', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('works without any optional fields', async () => {
    const { renderChatHeader } = await import('../src/app/ChatApp')
    const out = renderChatHeader({ provider: 'demo' })
    expect(out).toBeTruthy()
    expect(typeof out).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// ChatCommandOptions interface shape coverage
// ---------------------------------------------------------------------------

describe('ChatApp module exports', () => {
  it('exports ChatApp as a function', async () => {
    const mod = await import('../src/app/ChatApp')
    expect(typeof mod.ChatApp).toBe('function')
  })

  it('exports renderChatHeader as a function', async () => {
    const mod = await import('../src/app/ChatApp')
    expect(typeof mod.renderChatHeader).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// groupIntoTurns — pure message grouping logic
// ---------------------------------------------------------------------------

describe('groupIntoTurns', () => {
  type Msg = { id: string; role: 'user' | 'assistant' | 'system' | 'tool'; content: string; status: 'complete'; createdAt: Date }
  const mkMsg = (id: string, role: Msg['role'], content = ''): Msg => ({
    id, role, content, status: 'complete', createdAt: new Date(0),
  })

  it('returns [] for empty input', async () => {
    const { groupIntoTurns } = await import('../src/app/ChatApp')
    expect(groupIntoTurns([])).toEqual([])
  })

  it('starts a new turn on each user message and appends assistants to current turn', async () => {
    const { groupIntoTurns } = await import('../src/app/ChatApp')
    const msgs = [
      mkMsg('u1', 'user', 'hi'),
      mkMsg('a1', 'assistant', 'hello'),
      mkMsg('u2', 'user', 'bye'),
      mkMsg('a2', 'assistant', 'goodbye'),
    ]
    const turns = groupIntoTurns(msgs as never)
    expect(turns).toHaveLength(2)
    expect(turns[0]!.map(m => m.id)).toEqual(['u1', 'a1'])
    expect(turns[1]!.map(m => m.id)).toEqual(['u2', 'a2'])
  })

  it('puts system messages into their own turn and flushes the current one', async () => {
    const { groupIntoTurns } = await import('../src/app/ChatApp')
    const msgs = [
      mkMsg('u1', 'user'),
      mkMsg('a1', 'assistant'),
      mkMsg('s1', 'system'),
      mkMsg('u2', 'user'),
    ]
    const turns = groupIntoTurns(msgs as never)
    expect(turns).toHaveLength(3)
    expect(turns[0]!.map(m => m.id)).toEqual(['u1', 'a1'])
    expect(turns[1]!.map(m => m.id)).toEqual(['s1'])
    expect(turns[2]!.map(m => m.id)).toEqual(['u2'])
  })

  it('flushes a trailing partial turn (no user follow-up)', async () => {
    const { groupIntoTurns } = await import('../src/app/ChatApp')
    const msgs = [mkMsg('a1', 'assistant'), mkMsg('a2', 'assistant')]
    const turns = groupIntoTurns(msgs as never)
    expect(turns).toHaveLength(1)
    expect(turns[0]!).toHaveLength(2)
  })

  it('leading system message produces a system-only turn', async () => {
    const { groupIntoTurns } = await import('../src/app/ChatApp')
    const msgs = [mkMsg('s1', 'system'), mkMsg('u1', 'user')]
    const turns = groupIntoTurns(msgs as never)
    expect(turns).toHaveLength(2)
    expect(turns[0]!.map(m => m.id)).toEqual(['s1'])
    expect(turns[1]!.map(m => m.id)).toEqual(['u1'])
  })
})
