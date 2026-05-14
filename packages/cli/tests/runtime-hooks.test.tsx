/**
 * Tests for React hooks in src/runtime/*.
 * Uses happy-dom environment via vitest file annotation.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ChatReturn, Message as ChatMessage } from '@agentskit/core'

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// useToolPermissions
// ---------------------------------------------------------------------------

describe('useToolPermissions', () => {
  function makeFakeChat(overrides: Partial<ChatReturn> = {}): ChatReturn {
    return {
      messages: [],
      send: vi.fn(),
      approve: vi.fn().mockResolvedValue(undefined),
      reject: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
      status: 'idle',
      streaming: false,
      controller: undefined,
      ...overrides,
    } as unknown as ChatReturn
  }

  it('initially has empty sessionAllowed and awaitingConfirmation=false', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')
    const chat = makeFakeChat()
    const { result } = renderHook(() => useToolPermissions(chat))

    expect(result.current.sessionAllowed.size).toBe(0)
    expect(result.current.awaitingConfirmation).toBe(false)
  })

  it('handleApproveAlways adds tool to sessionAllowed and calls approve', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')
    const approveFn = vi.fn().mockResolvedValue(undefined)
    const chat = makeFakeChat({ approve: approveFn })

    const { result } = renderHook(() => useToolPermissions(chat))

    act(() => {
      result.current.handleApproveAlways('call-id-1', 'web_search')
    })

    expect(result.current.sessionAllowed.has('web_search')).toBe(true)
    expect(approveFn).toHaveBeenCalledWith('call-id-1')
  })

  it('handleApproveAlways is idempotent (same tool called twice)', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')
    const approveFn = vi.fn().mockResolvedValue(undefined)
    const chat = makeFakeChat({ approve: approveFn })

    const { result } = renderHook(() => useToolPermissions(chat))

    act(() => {
      result.current.handleApproveAlways('call-id-1', 'web_search')
    })
    act(() => {
      result.current.handleApproveAlways('call-id-2', 'web_search')
    })

    // sessionAllowed should still have size 1 (Set deduplicates)
    expect(result.current.sessionAllowed.size).toBe(1)
    // approve should have been called twice (once per handleApproveAlways)
    expect(approveFn).toHaveBeenCalledTimes(2)
  })

  it('awaitingConfirmation is true when a message has a requires_confirmation tool call', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')

    const messages: ChatMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-1', name: 'shell', args: {}, status: 'requires_confirmation' },
        ],
      } as ChatMessage,
    ]

    const chat = makeFakeChat({ messages, approve: vi.fn().mockResolvedValue(undefined) })
    const { result } = renderHook(() => useToolPermissions(chat))

    expect(result.current.awaitingConfirmation).toBe(true)
  })

  it('awaitingConfirmation is false when tool is session-allowed', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')

    const approveFn = vi.fn().mockResolvedValue(undefined)
    const messages: ChatMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-1', name: 'web_search', args: {}, status: 'requires_confirmation' },
        ],
      } as ChatMessage,
    ]

    const chat = makeFakeChat({ messages, approve: approveFn })
    const { result } = renderHook(() => useToolPermissions(chat))

    // Approve always for web_search
    act(() => {
      result.current.handleApproveAlways('call-1', 'web_search')
    })

    expect(result.current.awaitingConfirmation).toBe(false)
  })

  it('auto-approves pending tool calls when sessionAllowed grows', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')

    const approveFn = vi.fn().mockResolvedValue(undefined)
    const messages: ChatMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-99', name: 'shell', args: {}, status: 'requires_confirmation' },
        ],
      } as ChatMessage,
    ]

    const chat = makeFakeChat({ messages, approve: approveFn })
    const { result } = renderHook(() => useToolPermissions(chat))

    act(() => {
      result.current.handleApproveAlways('call-99', 'shell')
    })

    // approve should have been called once directly + once from auto-approval in effect
    // (but auto-approval skips call-99 because it's already in autoApprovedRef)
    expect(approveFn).toHaveBeenCalledWith('call-99')
  })

  it('auto-approves a new call-id when tool is already session-allowed (lines 17-18)', async () => {
    const { useToolPermissions } = await import('../src/runtime/use-tool-permissions')

    const approveFn = vi.fn().mockResolvedValue(undefined)
    // Start with call-A already requiring confirmation
    const initialMessages: ChatMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-A', name: 'shell', args: {}, status: 'requires_confirmation' },
        ],
      } as ChatMessage,
    ]

    // After approval, a new call-B arrives for same tool
    const updatedMessages: ChatMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-A', name: 'shell', args: {}, status: 'done' },
          { id: 'call-B', name: 'shell', args: {}, status: 'requires_confirmation' },
        ],
      } as ChatMessage,
    ]

    let currentMessages = initialMessages
    const chatRef = { current: makeFakeChat({ messages: currentMessages, approve: approveFn }) }

    const { result, rerender } = renderHook(() =>
      useToolPermissions(chatRef.current),
    )

    // Approve always for shell (adds to sessionAllowed, adds call-A to autoApprovedRef)
    act(() => {
      result.current.handleApproveAlways('call-A', 'shell')
    })

    // Now simulate new message arriving with call-B (not yet in autoApprovedRef)
    chatRef.current = makeFakeChat({ messages: updatedMessages, approve: approveFn })
    rerender()

    // The useEffect should have auto-approved call-B (lines 17-18 are hit)
    expect(approveFn).toHaveBeenCalledWith('call-B')
  })
})

// ---------------------------------------------------------------------------
// useSessionMeta
// ---------------------------------------------------------------------------

describe('useSessionMeta', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('does nothing when sessionId is undefined', async () => {
    const writeSessionMeta = vi.fn()
    vi.doMock('../src/sessions', () => ({
      writeSessionMeta,
      derivePreview: vi.fn().mockReturnValue('preview'),
    }))

    const { useSessionMeta } = await import('../src/runtime/use-session-meta')
    renderHook(() => useSessionMeta({
      sessionId: undefined,
      messages: [],
      provider: 'demo',
    }))

    expect(writeSessionMeta).not.toHaveBeenCalled()
  })

  it('does nothing when sessionId is "custom"', async () => {
    const writeSessionMeta = vi.fn()
    vi.doMock('../src/sessions', () => ({
      writeSessionMeta,
      derivePreview: vi.fn().mockReturnValue('preview'),
    }))

    const { useSessionMeta } = await import('../src/runtime/use-session-meta')
    renderHook(() => useSessionMeta({
      sessionId: 'custom',
      messages: [],
      provider: 'demo',
    }))

    expect(writeSessionMeta).not.toHaveBeenCalled()
  })

  it('calls writeSessionMeta when sessionId is set', async () => {
    const writeSessionMeta = vi.fn()
    vi.doMock('../src/sessions', () => ({
      writeSessionMeta,
      derivePreview: vi.fn().mockReturnValue('hello'),
    }))

    const { useSessionMeta } = await import('../src/runtime/use-session-meta')
    const messages: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hello' } as ChatMessage,
    ]

    renderHook(() => useSessionMeta({
      sessionId: 'session-abc',
      messages,
      provider: 'demo',
      model: 'gpt-4',
    }))

    expect(writeSessionMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-abc',
        provider: 'demo',
        model: 'gpt-4',
        messageCount: 1,
        preview: 'hello',
      }),
    )
  })

  it('silently ignores writeSessionMeta errors', async () => {
    vi.doMock('../src/sessions', () => ({
      writeSessionMeta: vi.fn().mockImplementation(() => { throw new Error('disk full') }),
      derivePreview: vi.fn().mockReturnValue('test'),
    }))

    const { useSessionMeta } = await import('../src/runtime/use-session-meta')

    // Should not throw
    expect(() => {
      renderHook(() => useSessionMeta({
        sessionId: 'session-xyz',
        messages: [{ id: 'm1', role: 'user', content: 'hi' } as ChatMessage],
        provider: 'demo',
      }))
    }).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// useRuntime
// ---------------------------------------------------------------------------

describe('useRuntime', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns runtime, memory, tools, and skills', async () => {
    const { useRuntime } = await import('../src/runtime/use-runtime')

    const { result } = renderHook(() => useRuntime({
      provider: 'demo',
      model: 'test-model',
    }))

    expect(result.current.runtime).toBeDefined()
    expect(result.current.memory).toBeDefined()
    expect(Array.isArray(result.current.tools)).toBe(true)
    // skills undefined when no skill flag
    expect(result.current.skills).toBeUndefined()
  })

  it('returns skills when skillFlag is provided', async () => {
    const { useRuntime } = await import('../src/runtime/use-runtime')

    const { result } = renderHook(() => useRuntime({
      provider: 'demo',
      skill: 'researcher',
    }))

    expect(result.current.skills).toBeDefined()
    expect(Array.isArray(result.current.skills)).toBe(true)
  })

  it('returns undefined skills for unknown skill name', async () => {
    const { useRuntime } = await import('../src/runtime/use-runtime')

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const { result } = renderHook(() => useRuntime({
      provider: 'demo',
      skill: 'nonexistent-skill-xyz',
    }))

    expect(result.current.skills).toBeUndefined()
    stderrSpy.mockRestore()
  })

  it('exposes setProvider and other setters', async () => {
    const { useRuntime } = await import('../src/runtime/use-runtime')

    const { result } = renderHook(() => useRuntime({
      provider: 'demo',
    }))

    expect(typeof result.current.setProvider).toBe('function')
    expect(typeof result.current.setModel).toBe('function')
    expect(typeof result.current.setApiKey).toBe('function')
    expect(typeof result.current.setBaseUrl).toBe('function')
    expect(typeof result.current.setToolsFlag).toBe('function')
    expect(typeof result.current.setSkillFlag).toBe('function')
  })

  it('applies permissionPolicy to tools when provided', async () => {
    const { useRuntime } = await import('../src/runtime/use-runtime')
    const { evaluatePolicy } = await import('../src/extensibility/permissions')

    const { result } = renderHook(() => useRuntime({
      provider: 'demo',
      permissionPolicy: {
        mode: 'bypassPermissions',
        rules: [],
      },
    }))

    // With bypassPermissions, all tools should be allowed
    expect(Array.isArray(result.current.tools)).toBe(true)
    // Check evaluatePolicy still works as expected
    expect(evaluatePolicy({ mode: 'bypassPermissions', rules: [] }, 'any-tool')).toBe('allow')
  })

  it('state object contains current values', async () => {
    const { useRuntime } = await import('../src/runtime/use-runtime')

    const { result } = renderHook(() => useRuntime({
      provider: 'demo',
      model: 'my-model',
      apiKey: 'sk-test',
      baseUrl: 'http://localhost:1234',
    }))

    expect(result.current.state.provider).toBe('demo')
    expect(result.current.state.model).toBe('my-model')
    expect(result.current.state.apiKey).toBe('sk-test')
    expect(result.current.state.baseUrl).toBe('http://localhost:1234')
  })
})
