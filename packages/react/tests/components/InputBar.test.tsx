import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { InputBar } from '../../src/components/InputBar'
import type { ChatReturn } from '@agentskit/core'

function mockChat(overrides?: Partial<ChatReturn>): ChatReturn {
  return {
    messages: [],
    status: 'idle',
    stop: vi.fn(),
    retry: vi.fn(),
    input: '',
    error: null,
    send: vi.fn(async () => {}),
    setInput: vi.fn(),
    clear: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('InputBar', () => {
  it('renders an input and submit button', () => {
    render(<InputBar chat={mockChat()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('does not set a redundant role=textbox on the native textarea', () => {
    const { container } = render(<InputBar chat={mockChat()} />)
    const textarea = container.querySelector('[data-ak-input]') as HTMLTextAreaElement
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea.hasAttribute('role')).toBe(false)
  })

  it('calls setInput on input change', () => {
    const chat = mockChat()
    render(<InputBar chat={chat} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hi' } })
    expect(chat.setInput).toHaveBeenCalledWith('Hi')
  })

  it('calls send on form submit', () => {
    const chat = mockChat({ input: 'Hello' })
    render(<InputBar chat={chat} />)
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(chat.send).toHaveBeenCalledWith('Hello')
  })

  it('calls send on Send button click', () => {
    const chat = mockChat({ input: 'Click me' })
    render(<InputBar chat={chat} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(chat.send).toHaveBeenCalledWith('Click me')
  })

  it('disables input when disabled prop is true', () => {
    render(<InputBar chat={mockChat()} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('applies custom placeholder', () => {
    render(<InputBar chat={mockChat()} placeholder="Ask anything..." />)
    expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument()
  })

  it('calls send on Enter key without Shift', () => {
    const chat = mockChat({ input: 'Hello Enter' })
    render(<InputBar chat={chat} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: false })
    expect(chat.send).toHaveBeenCalledWith('Hello Enter')
  })

  it('does not call send on Enter+Shift (soft newline)', () => {
    const chat = mockChat({ input: 'Hello' })
    render(<InputBar chat={chat} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true })
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('does not call send on Enter when input is whitespace only', () => {
    const chat = mockChat({ input: '   ' })
    render(<InputBar chat={chat} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: false })
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('does not call send on form submit when input is empty', () => {
    const chat = mockChat({ input: '' })
    render(<InputBar chat={chat} />)
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('disables textarea and send while streaming', () => {
    const chat = mockChat({ input: 'ready', status: 'streaming' })
    render(<InputBar chat={chat} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('blocks form submit while streaming', () => {
    const chat = mockChat({ input: 'ready', status: 'streaming' })
    render(<InputBar chat={chat} />)
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('blocks Enter while streaming', () => {
    const chat = mockChat({ input: 'ready', status: 'streaming' })
    render(<InputBar chat={chat} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: false })
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('blocks Send click while streaming even if forced', () => {
    const chat = mockChat({ input: 'ready', status: 'streaming' })
    render(<InputBar chat={chat} />)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('blocks all send paths when disabled', () => {
    const chat = mockChat({ input: 'ready' })
    render(<InputBar chat={chat} disabled />)
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: false })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(chat.send).not.toHaveBeenCalled()
  })

  it('isolates multi-instance send paths', () => {
    const a = mockChat({ input: 'alpha' })
    const b = mockChat({ input: 'beta' })
    const { container } = render(
      <>
        <InputBar chat={a} />
        <InputBar chat={b} />
      </>,
    )
    const forms = container.querySelectorAll('[data-ak-input-bar]')
    fireEvent.submit(forms[0]!)
    expect(a.send).toHaveBeenCalledWith('alpha')
    expect(b.send).not.toHaveBeenCalled()
    fireEvent.submit(forms[1]!)
    expect(b.send).toHaveBeenCalledWith('beta')
    expect(a.send).toHaveBeenCalledTimes(1)
  })
})
