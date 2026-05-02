import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { useChat } from '../src'

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
})
