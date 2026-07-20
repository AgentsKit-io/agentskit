import { describe, expect, it, vi } from 'vitest'
import { createApp, effectScope, h, nextTick } from 'vue'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { useChat, ChatContainer } from '../src'

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

describe('@agentskit/vue', () => {
  it('exports useChat + ChatContainer', () => {
    expect(typeof useChat).toBe('function')
    expect(ChatContainer).toBeDefined()
  })

  it('returns reactive state with controller actions', async () => {
    const scope = effectScope()
    const chat = scope.run(() => useChat({ adapter: mockAdapter([]) }))!
    expect(chat.messages).toEqual([])
    expect(chat.status).toBe('idle')
    expect(chat.input).toBe('')
    expect(typeof chat.send).toBe('function')
    expect(typeof chat.stop).toBe('function')
    expect(typeof chat.retry).toBe('function')
    expect(typeof chat.setInput).toBe('function')
    expect(typeof chat.clear).toBe('function')
    scope.stop()
  })

  it('streams assistant content into reactive state', async () => {
    const scope = effectScope()
    const chat = scope.run(() =>
      useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'hi' },
          { type: 'done' },
        ]),
      }),
    )!
    await chat.send('hello')
    await nextTick()
    expect(chat.messages.length).toBeGreaterThanOrEqual(2)
    expect(chat.messages[chat.messages.length - 1]?.role).toBe('assistant')
    scope.stop()
  })

  it('setInput updates reactive input field', async () => {
    const scope = effectScope()
    const chat = scope.run(() => useChat({ adapter: mockAdapter([]) }))!
    chat.setInput('draft')
    await nextTick()
    expect(chat.input).toBe('draft')
    scope.stop()
  })

  it('ChatContainer renders messages and input form', async () => {
    const root = document.createElement('div')
    const app = createApp({
      render: () => h(ChatContainer, { config: { adapter: mockAdapter([]) } }),
    })
    app.mount(root)
    await nextTick()
    expect(root.querySelector('[data-ak-chat]')).not.toBeNull()
    expect(root.querySelector('[data-ak-input]')).not.toBeNull()
    expect(root.querySelector('[data-ak-submit]')).not.toBeNull()
    app.unmount()
  })

  it('ChatContainer renders message rows, handles input + submit', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () =>
        h(ChatContainer, {
          config: {
            adapter: mockAdapter([
              { type: 'text', content: 'hello back' },
              { type: 'done' },
            ]),
          },
        }),
    })
    app.mount(root)
    await nextTick()

    const input = root.querySelector('[data-ak-input]') as HTMLInputElement
    input.value = 'hi'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(input.value).toBe('hi')

    const form = root.querySelector('[data-ak-form]') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { cancelable: true }))
    // wait for stream to complete
    await new Promise(r => setTimeout(r, 20))
    await nextTick()

    const rows = root.querySelectorAll('[data-ak-message]')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const roles = Array.from(rows).map(r => r.getAttribute('data-ak-role'))
    expect(roles).toContain('user')

    app.unmount()
    root.remove()
  })

  it('scope dispose unsubscribes and stops an in-flight stream', async () => {
    const abort = vi.fn()
    let sourceReady: (() => void) | undefined
    const ready = new Promise<void>(resolve => {
      sourceReady = resolve
    })
    const scope = effectScope()
    const chat = scope.run(() =>
      useChat({
        adapter: hangingAdapter({
          abort,
          onSource: () => sourceReady?.(),
        }),
      }),
    )!

    void chat.send('go')
    await ready

    scope.stop()
    scope.stop()

    expect(abort).toHaveBeenCalledOnce()
  })

  it('isolates state across concurrent useChat instances', async () => {
    const scope = effectScope()
    const a = scope.run(() =>
      useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'from-a' },
          { type: 'done' },
        ]),
      }),
    )!
    const b = scope.run(() =>
      useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'from-b' },
          { type: 'done' },
        ]),
      }),
    )!

    a.setInput('draft-a')
    b.setInput('draft-b')
    expect(a.input).toBe('draft-a')
    expect(b.input).toBe('draft-b')

    await a.send('hello-a')
    await nextTick()
    expect(a.messages.some(m => m.content === 'from-a')).toBe(true)
    expect(b.messages).toHaveLength(0)

    scope.stop()
  })
})
