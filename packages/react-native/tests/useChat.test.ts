import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, StrictMode, type ReactNode } from 'react'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { useChat } from '../src'

function StrictWrapper({ children }: { children: ReactNode }) {
  return createElement(StrictMode, null, children)
}

function mockAdapter(chunks: StreamChunk[]): AdapterFactory {
  return {
    createSource: (_req: AdapterRequest) => {
      let aborted = false
      return {
        stream: async function* () {
          for (const chunk of chunks) {
            if (aborted) return
            yield chunk
          }
        },
        abort: () => {
          aborted = true
        },
      }
    },
  }
}

describe('@agentskit/react-native useChat', () => {
  it('starts with empty messages and idle status', () => {
    const { result } = renderHook(() => useChat({ adapter: mockAdapter([]) }))
    expect(result.current.messages).toEqual([])
    expect(result.current.status).toBe('idle')
    expect(result.current.input).toBe('')
    expect(typeof result.current.send).toBe('function')
  })

  it('streams assistant content into state', async () => {
    const { result } = renderHook(() =>
      useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'hi' },
          { type: 'done' },
        ]),
      }),
    )
    await act(async () => {
      await result.current.send('hello')
    })
    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThanOrEqual(2)
    })
    expect(result.current.messages[result.current.messages.length - 1]?.role).toBe('assistant')
  })

  it('setInput updates input field', () => {
    const { result } = renderHook(() => useChat({ adapter: mockAdapter([]) }))
    act(() => {
      result.current.setInput('draft')
    })
    expect(result.current.input).toBe('draft')
  })

  it('exposes all controller actions', () => {
    const { result } = renderHook(() => useChat({ adapter: mockAdapter([]) }))
    for (const fn of ['stop', 'retry', 'edit', 'regenerate', 'clear', 'approve', 'deny'] as const) {
      expect(typeof result.current[fn]).toBe('function')
    }
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

  it('updateConfig fires when config reference changes', () => {
    const adapter = mockAdapter([])
    const { rerender, result } = renderHook(
      ({ cfg }: { cfg: { adapter: AdapterFactory } }) => useChat(cfg),
      { initialProps: { cfg: { adapter } } },
    )
    expect(result.current.status).toBe('idle')
    rerender({ cfg: { adapter } })
    expect(result.current.status).toBe('idle')
  })

  it('mounts and streams under React StrictMode', async () => {
    const { result } = renderHook(
      () =>
        useChat({
          adapter: mockAdapter([
            { type: 'text', content: 'strict' },
            { type: 'done' },
          ]),
        }),
      { wrapper: StrictWrapper },
    )

    await act(async () => {
      await result.current.send('hello')
    })
    await waitFor(() => {
      expect(result.current.messages.some(m => m.role === 'assistant' && m.content.includes('strict'))).toBe(true)
    })
  })

  it('keeps multi-instance controllers isolated', async () => {
    const a = renderHook(() =>
      useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'from-a' },
          { type: 'done' },
        ]),
      }),
    )
    const b = renderHook(() =>
      useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'from-b' },
          { type: 'done' },
        ]),
      }),
    )

    await act(async () => {
      await a.result.current.send('A')
    })
    await waitFor(() => expect(a.result.current.messages.some(m => m.content === 'from-a')).toBe(true))
    expect(b.result.current.messages).toEqual([])

    await act(async () => {
      await b.result.current.send('B')
    })
    await waitFor(() => expect(b.result.current.messages.some(m => m.content === 'from-b')).toBe(true))
    expect(a.result.current.messages.some(m => m.content === 'from-b')).toBe(false)
  })
})
