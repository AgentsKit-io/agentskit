import { describe, expect, it } from 'vitest'
import { createRoot } from 'solid-js'
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

describe('@agentskit/solid', () => {
  it('exports useChat', () => {
    expect(typeof useChat).toBe('function')
  })

  it('returns reactive state with controller actions', () => {
    createRoot(dispose => {
      const chat = useChat({ adapter: mockAdapter([]) })
      expect(chat.messages).toEqual([])
      expect(chat.status).toBe('idle')
      expect(chat.input).toBe('')
      expect(typeof chat.send).toBe('function')
      expect(typeof chat.stop).toBe('function')
      expect(typeof chat.retry).toBe('function')
      expect(typeof chat.setInput).toBe('function')
      expect(typeof chat.clear).toBe('function')
      dispose()
    })
  })

  it('streams assistant content into reactive store', async () => {
    await createRoot(async dispose => {
      const chat = useChat({
        adapter: mockAdapter([
          { type: 'text', content: 'hi' },
          { type: 'done' },
        ]),
      })
      await chat.send('hello')
      expect(chat.messages.length).toBeGreaterThanOrEqual(2)
      expect(chat.messages[chat.messages.length - 1]?.role).toBe('assistant')
      dispose()
    })
  })

  it('setInput updates reactive input field', () => {
    createRoot(dispose => {
      const chat = useChat({ adapter: mockAdapter([]) })
      chat.setInput('draft')
      expect(chat.input).toBe('draft')
      dispose()
    })
  })
})
