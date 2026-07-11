import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '../../src/useChat'
import { createInMemoryMemory } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, Message, StreamChunk } from '@agentskit/core'

function createMockAdapter(chunks: StreamChunk[]): AdapterFactory {
  return {
    createSource: (_request: AdapterRequest) => {
      let aborted = false
      return {
        stream: async function* () {
          for (const chunk of chunks) {
            if (aborted) return
            yield chunk
          }
        },
        abort: () => { aborted = true },
      }
    },
  }
}

describe('useChat', () => {
  it('starts with empty messages and idle status', () => {
    const adapter = createMockAdapter([])
    const { result } = renderHook(() => useChat({ adapter }))
    expect(result.current.messages).toEqual([])
    expect(result.current.status).toBe('idle')
    expect(result.current.input).toBe('')
  })

  it('initializes with initialMessages if provided', () => {
    const adapter = createMockAdapter([])
    const initial: Message[] = [{
      id: '1',
      role: 'system',
      content: 'You are helpful.',
      status: 'complete',
      createdAt: new Date(),
    }]
    const { result } = renderHook(() =>
      useChat({ adapter, initialMessages: initial })
    )
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].content).toBe('You are helpful.')
  })

  it('send() adds user message and streams assistant response', async () => {
    const adapter = createMockAdapter([
      { type: 'text', content: 'Hi there!' },
      { type: 'done' },
    ])
    const { result } = renderHook(() => useChat({ adapter }))

    await act(async () => {
      await result.current.send('Hello')
    })

    await waitFor(() => {
      expect(result.current.status).toBe('idle')
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('Hi there!')
    expect(result.current.messages[1].status).toBe('complete')
  })

  it('setInput updates the input value', () => {
    const adapter = createMockAdapter([])
    const { result } = renderHook(() => useChat({ adapter }))

    act(() => {
      result.current.setInput('new value')
    })

    expect(result.current.input).toBe('new value')
  })

  it('calls onMessage when assistant message completes', async () => {
    const onMessage = vi.fn()
    const adapter = createMockAdapter([
      { type: 'text', content: 'Done' },
      { type: 'done' },
    ])
    const { result } = renderHook(() =>
      useChat({ adapter, onMessage })
    )

    await act(async () => {
      await result.current.send('Go')
    })

    await waitFor(() => {
      expect(result.current.status).toBe('idle')
    })

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', content: 'Done' })
    )
  })

  it('stop() aborts the current stream', async () => {
    const abortFn = vi.fn()
    const adapter: AdapterFactory = {
      createSource: () => ({
        stream: async function* () {
          while (true) {
            yield { type: 'text' as const, content: 'chunk ' }
            await new Promise(r => setTimeout(r, 50))
          }
        },
        abort: abortFn,
      }),
    }

    const { result } = renderHook(() => useChat({ adapter }))

    void act(() => {
      void result.current.send('Go')
    })

    await waitFor(() => {
      expect(result.current.status).toBe('streaming')
    })

    act(() => {
      result.current.stop()
    })

    expect(abortFn).toHaveBeenCalled()
  })

  it('aborts the current stream when unmounted', async () => {
    const abort = vi.fn()
    const adapter: AdapterFactory = {
      createSource: () => ({
        async *stream() {
          yield { type: 'text', content: 'working' } as const
          await new Promise(() => {})
        },
        abort,
      }),
    }
    const { result, unmount } = renderHook(() => useChat({ adapter }))

    void act(() => { void result.current.send('Go') })
    await waitFor(() => expect(result.current.status).toBe('streaming'))
    unmount()

    expect(abort).toHaveBeenCalledOnce()
  })

  it('hydrates from persistent memory', async () => {
    const adapter = createMockAdapter([])
    const memory = createInMemoryMemory([{
      id: 'persisted',
      role: 'assistant',
      content: 'Welcome back',
      status: 'complete',
      createdAt: new Date(),
    }])

    const { result } = renderHook(() => useChat({ adapter, memory }))

    await waitFor(() => {
      expect(result.current.messages[0]?.content).toBe('Welcome back')
    })
  })

  it('executes tools exposed through the core controller', async () => {
    const execute = vi.fn().mockResolvedValue('Sunny')
    const adapter = createMockAdapter([
      {
        type: 'tool_call',
        toolCall: {
          id: 'tool-1',
          name: 'weather',
          args: JSON.stringify({ city: 'Sao Paulo' }),
        },
      },
      { type: 'done' },
    ])

    const { result } = renderHook(() =>
      useChat({
        adapter,
        tools: [{ name: 'weather', execute }],
      })
    )

    await act(async () => {
      await result.current.send('How is the weather?')
    })

    await waitFor(() => {
      expect(result.current.messages[1]?.toolCalls?.[0]?.result).toBe('Sunny')
    })

    expect(execute).toHaveBeenCalledWith(
      { city: 'Sao Paulo' },
      expect.objectContaining({
        call: expect.objectContaining({ name: 'weather' }),
      })
    )
  })
})
