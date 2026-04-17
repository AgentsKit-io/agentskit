import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import { ChatContainer, Message, InputBar, ThinkingIndicator } from '../src/components'
import { useChat } from '../src/useChat'
import type { AdapterFactory, AdapterRequest, StreamChunk, Message as MessageType } from '@agentskit/core'

// Same strategy as InputBar.test.tsx: ink-testing-library@4 does not trigger
// useInput under ink@7. We intercept the handler and drive keyboard input
// directly. See #266.

type Key = Parameters<Parameters<typeof import('ink').useInput>[0]>[1]

let capturedHandler: ((input: string, key: Key) => void) | undefined

vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink')
  return {
    ...actual,
    useInput: (handler: (input: string, key: Key) => void) => {
      capturedHandler = handler
    },
  }
})

const key = (overrides: Partial<Key> = {}): Key => ({
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  ...overrides,
} as Key)

const flush = () => new Promise(r => setTimeout(r, 0))

const typeText = async (text: string) => {
  for (const char of text) {
    capturedHandler!(char, key())
    await flush()
  }
}

const pressEnter = () => capturedHandler!('', key({ return: true }))

const delay = (ms = 50) => new Promise(r => setTimeout(r, ms))

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

function ChatApp({ adapter }: { adapter: AdapterFactory }) {
  const chat = useChat({ adapter })

  return (
    <ChatContainer>
      {chat.messages.map((msg: MessageType) => (
        <Message key={msg.id} message={msg} />
      ))}
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} />
    </ChatContainer>
  )
}

describe('Ink chat integration', () => {
  beforeEach(() => {
    capturedHandler = undefined
  })

  it('renders empty chat with input bar', () => {
    const adapter = createMockAdapter([])
    const { lastFrame } = render(<ChatApp adapter={adapter} />)
    const output = lastFrame()
    expect(output).toContain('Type a message...')
  })

  it('full chat flow: type message → send → stream response → complete', async () => {
    const adapter = createMockAdapter([
      { type: 'text', content: 'Hello from ' },
      { type: 'text', content: 'AgentsKit!' },
      { type: 'done' },
    ])

    const { lastFrame, rerender } = render(<ChatApp adapter={adapter} />)

    await typeText('Hi')
    rerender(<ChatApp adapter={adapter} />)
    expect(lastFrame()).toContain('Hi')

    pressEnter()
    await delay(200)
    rerender(<ChatApp adapter={adapter} />)

    const output = lastFrame()
    expect(output).toContain('you')
    expect(output).toContain('Hello from AgentsKit!')
    expect(output).toContain('assistant')
  })

  it('shows thinking indicator during streaming', async () => {
    let resolveStream: (() => void) | undefined
    const adapter: AdapterFactory = {
      createSource: () => ({
        stream: async function* () {
          yield { type: 'text' as const, content: 'partial' }
          await new Promise<void>(r => { resolveStream = r })
          yield { type: 'done' as const }
        },
        abort: () => { resolveStream?.() },
      }),
    }

    const { lastFrame, rerender } = render(<ChatApp adapter={adapter} />)

    await typeText('go')
    rerender(<ChatApp adapter={adapter} />)
    pressEnter()
    await delay(200)
    rerender(<ChatApp adapter={adapter} />)

    expect(lastFrame()).toContain('Thinking')

    resolveStream?.()
    await delay(200)
    rerender(<ChatApp adapter={adapter} />)

    expect(lastFrame()).not.toContain('Thinking')
  })
})
