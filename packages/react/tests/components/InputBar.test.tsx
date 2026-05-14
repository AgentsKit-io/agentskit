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
})
