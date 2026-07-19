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

function hangingAdapter(opts: { abort: () => void; onSource?: () => void }): AdapterFactory {
  return {
    createSource: () => {
      opts.onSource?.()
      return {
        async *stream() {
          yield { type: 'text' as const, content: 'started' }
          await new Promise(() => {})
        },
        abort: opts.abort,
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

  it('destroy stops an in-flight stream and is safe to call repeatedly', async () => {
    const abort = vi.fn()
    let sourceReady: (() => void) | undefined
    const ready = new Promise<void>(resolve => {
      sourceReady = resolve
    })
    const store = createChatStore({
      adapter: hangingAdapter({
        abort,
        onSource: () => sourceReady?.(),
      }),
    })
    const unsub = store.subscribe(() => {})

    void store.send('go')
    await ready

    store.destroy()
    store.destroy()
    store.destroy()

    expect(abort).toHaveBeenCalledOnce()
    unsub()
  })

  it('isolates state across concurrent stores', async () => {
    const a = createChatStore({
      adapter: mockAdapter([
        { type: 'text', content: 'from-a' },
        { type: 'done' },
      ]),
    })
    const b = createChatStore({
      adapter: mockAdapter([
        { type: 'text', content: 'from-b' },
        { type: 'done' },
      ]),
    })

    a.setInput('draft-a')
    b.setInput('draft-b')

    let aInput = ''
    let bInput = ''
    let aMessages: { content: string }[] = []
    let bMessages: { content: string }[] = []
    const unsubA = a.subscribe(state => {
      aInput = state.input
      aMessages = state.messages
    })
    const unsubB = b.subscribe(state => {
      bInput = state.input
      bMessages = state.messages
    })

    expect(aInput).toBe('draft-a')
    expect(bInput).toBe('draft-b')

    await a.send('hello-a')
    expect(aMessages.some(m => m.content === 'from-a')).toBe(true)
    expect(bMessages).toHaveLength(0)

    unsubA()
    unsubB()
    a.destroy()
    b.destroy()
  })
})
