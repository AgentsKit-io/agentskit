import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { InputBar } from '../src/components/InputBar'
import type { ChatReturn } from '@agentskit/core'

const delay = (ms = 50) => new Promise(r => setTimeout(r, ms))

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

  it('typing characters calls setInput with appended text', async () => {
    const setInput = vi.fn()
    const chat = mockChat({ input: 'hel', setInput })
    const { stdin } = render(<InputBar chat={chat} />)

    await delay()
    stdin.write('l')
    await delay()
    expect(setInput).toHaveBeenCalledWith('hell')
  })

  it('backspace calls setInput with trimmed text', async () => {
    const setInput = vi.fn()
    const chat = mockChat({ input: 'hello', setInput })
    const { stdin } = render(<InputBar chat={chat} />)

    await delay()
    stdin.write('\x7F')
    await delay()
    expect(setInput).toHaveBeenCalledWith('hell')
  })

  it('enter sends the message when input is not empty', async () => {
    const send = vi.fn()
    const chat = mockChat({ input: 'hello', send })
    const { stdin } = render(<InputBar chat={chat} />)

    await delay()
    stdin.write('\r')
    await delay()
    expect(send).toHaveBeenCalledWith('hello')
  })

  it('enter does nothing when input is empty', async () => {
    const send = vi.fn()
    const chat = mockChat({ input: '', send })
    const { stdin } = render(<InputBar chat={chat} />)

    await delay()
    stdin.write('\r')
    await delay()
    expect(send).not.toHaveBeenCalled()
  })

  it('enter does nothing when input is whitespace only', async () => {
    const send = vi.fn()
    const chat = mockChat({ input: '   ', send })
    const { stdin } = render(<InputBar chat={chat} />)

    await delay()
    stdin.write('\r')
    await delay()
    expect(send).not.toHaveBeenCalled()
  })

  it('blocks input while streaming (prevents double-send)', async () => {
    const setInput = vi.fn()
    const send = vi.fn()
    const chat = mockChat({ input: 'hello', status: 'streaming', setInput, send })
    const { stdin } = render(<InputBar chat={chat} />)

    await delay()
    stdin.write('\r')
    stdin.write('x')
    await delay()
    expect(send).not.toHaveBeenCalled()
    expect(setInput).not.toHaveBeenCalled()
  })

  it('disabled prop blocks all input', async () => {
    const setInput = vi.fn()
    const send = vi.fn()
    const chat = mockChat({ input: 'test', setInput, send })
    const { stdin } = render(<InputBar chat={chat} disabled />)

    await delay()
    stdin.write('x')
    stdin.write('\r')
    stdin.write('\x7F')
    await delay()
    expect(setInput).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })
})
