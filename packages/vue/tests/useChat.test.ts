import { describe, expect, it } from 'vitest'
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
})
