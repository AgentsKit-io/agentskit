import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'ink-testing-library'
import { InputBar } from '../src/components/InputBar'
import type { ChatReturn } from '@agentskit/core'

// ink-testing-library@4 does not route stdin through ink@7's new raw-mode
// input pipeline, so useInput callbacks never fire. To test InputBar's
// keyboard behavior we mock the useInput hook and capture its handler,
// then invoke it directly with the same (input, key) shape ink would pass.
//
// This validates the actual InputBar logic (setInput/send/guards) without
// depending on the broken test harness. See #266.

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

function mockChat(overrides?: Partial<ChatReturn>): ChatReturn {
  return {
    messages: [],
    status: 'idle',
    input: '',
    error: null,
    send: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    setInput: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  }
}

describe('InputBar', () => {
  beforeEach(() => {
    capturedHandler = undefined
  })

  it('renders placeholder text', () => {
    const chat = mockChat()
    const { lastFrame } = render(<InputBar chat={chat} />)
    expect(lastFrame()).toContain('Type a message...')
  })

  it('renders custom placeholder', () => {
    const chat = mockChat()
    const { lastFrame } = render(<InputBar chat={chat} placeholder="Ask anything..." />)
    expect(lastFrame()).toContain('Ask anything...')
  })

  it('renders current input value', () => {
    const chat = mockChat({ input: 'hello world' })
    const { lastFrame } = render(<InputBar chat={chat} />)
    expect(lastFrame()).toContain('hello world')
  })

  it('typing characters calls setInput with appended text', () => {
    const setInput = vi.fn()
    const chat = mockChat({ input: 'hel', setInput })
    render(<InputBar chat={chat} />)

    capturedHandler!('l', key())
    expect(setInput).toHaveBeenCalledWith('hell')
  })

  it('backspace calls setInput with trimmed text', () => {
    const setInput = vi.fn()
    const chat = mockChat({ input: 'hello', setInput })
    render(<InputBar chat={chat} />)

    capturedHandler!('', key({ backspace: true }))
    expect(setInput).toHaveBeenCalledWith('hell')
  })

  it('enter sends the message when input is not empty', () => {
    const send = vi.fn()
    const chat = mockChat({ input: 'hello', send })
    render(<InputBar chat={chat} />)

    capturedHandler!('', key({ return: true }))
    expect(send).toHaveBeenCalledWith('hello')
  })

  it('enter does nothing when input is empty', () => {
    const send = vi.fn()
    const chat = mockChat({ input: '', send })
    render(<InputBar chat={chat} />)

    capturedHandler!('', key({ return: true }))
    expect(send).not.toHaveBeenCalled()
  })

  it('enter does nothing when input is whitespace only', () => {
    const send = vi.fn()
    const chat = mockChat({ input: '   ', send })
    render(<InputBar chat={chat} />)

    capturedHandler!('', key({ return: true }))
    expect(send).not.toHaveBeenCalled()
  })

  it('blocks input while streaming (prevents double-send)', () => {
    const setInput = vi.fn()
    const send = vi.fn()
    const chat = mockChat({ input: 'hello', status: 'streaming', setInput, send })
    render(<InputBar chat={chat} />)

    capturedHandler!('', key({ return: true }))
    capturedHandler!('x', key())
    expect(send).not.toHaveBeenCalled()
    expect(setInput).not.toHaveBeenCalled()
  })

  it('disabled prop blocks all input', () => {
    const setInput = vi.fn()
    const send = vi.fn()
    const chat = mockChat({ input: 'test', setInput, send })
    render(<InputBar chat={chat} disabled />)

    capturedHandler!('x', key())
    capturedHandler!('', key({ return: true }))
    capturedHandler!('', key({ backspace: true }))
    expect(setInput).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('ignores ctrl key combinations', () => {
    const setInput = vi.fn()
    const chat = mockChat({ input: 'hi', setInput })
    render(<InputBar chat={chat} />)

    capturedHandler!('c', key({ ctrl: true }))
    expect(setInput).not.toHaveBeenCalled()
  })

  it('ignores meta key combinations', () => {
    const setInput = vi.fn()
    const chat = mockChat({ input: 'hi', setInput })
    render(<InputBar chat={chat} />)

    capturedHandler!('v', key({ meta: true }))
    expect(setInput).not.toHaveBeenCalled()
  })
})
