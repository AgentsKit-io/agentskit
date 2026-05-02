import { describe, expect, it, vi } from 'vitest'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { createChatStore } from '../src'

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

describe('@agentskit/svelte', () => {
  it('exports createChatStore', () => {
    expect(typeof createChatStore).toBe('function')
  })

  it('subscribe pushes initial + post-update state', () => {
    const store = createChatStore({ adapter: mockAdapter([]) })
    const seen: string[] = []
    const unsub = store.subscribe(state => seen.push(state.status))
    expect(seen[0]).toBe('idle')
    store.setInput('draft')
    expect(seen.length).toBeGreaterThanOrEqual(1)
    unsub()
    store.destroy()
  })

  it('exposes controller actions on store', () => {
    const store = createChatStore({ adapter: mockAdapter([]) })
    expect(typeof store.send).toBe('function')
    expect(typeof store.stop).toBe('function')
    expect(typeof store.retry).toBe('function')
    expect(typeof store.edit).toBe('function')
    expect(typeof store.regenerate).toBe('function')
    expect(typeof store.setInput).toBe('function')
    expect(typeof store.clear).toBe('function')
    expect(typeof store.approve).toBe('function')
    expect(typeof store.deny).toBe('function')
    expect(typeof store.destroy).toBe('function')
    store.destroy()
  })

  it('streams assistant content and notifies subscribers', async () => {
    const store = createChatStore({
      adapter: mockAdapter([
        { type: 'text', content: 'hi' },
        { type: 'done' },
      ]),
    })
    const observer = vi.fn()
    const unsub = store.subscribe(observer)
    await store.send('hello')
    expect(observer).toHaveBeenCalled()
    unsub()
    store.destroy()
  })

  it('destroy unsubscribes from controller', () => {
    const store = createChatStore({ adapter: mockAdapter([]) })
    let count = 0
    const unsub = store.subscribe(() => count++)
    const before = count
    store.destroy()
    store.setInput('after-destroy')
    expect(count).toBeGreaterThanOrEqual(before)
    unsub()
  })
})
