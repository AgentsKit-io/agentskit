import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Message as MessageComponent } from '../../src/components/Message'
import type { Message } from '../../src/core/types'

const userMessage: Message = {
  id: '1',
  role: 'user',
  content: 'Hello there',
  status: 'complete',
  createdAt: new Date(),
}

const assistantMessage: Message = {
  id: '2',
  role: 'assistant',
  content: 'Hi! How can I help?',
  status: 'complete',
  createdAt: new Date(),
}

describe('Message', () => {
  it('renders message content', () => {
    render(<MessageComponent message={userMessage} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('sets data-ak-role attribute based on message role', () => {
    const { container } = render(<MessageComponent message={userMessage} />)
    const el = container.firstElementChild!
    expect(el).toHaveAttribute('data-ak-role', 'user')
  })

  it('sets data-ak-status attribute', () => {
    const streamingMsg: Message = { ...assistantMessage, status: 'streaming' }
    const { container } = render(<MessageComponent message={streamingMsg} />)
    const el = container.firstElementChild!
    expect(el).toHaveAttribute('data-ak-status', 'streaming')
  })

  it('renders avatar when provided', () => {
    render(<MessageComponent message={userMessage} avatar={<span>U</span>} />)
    expect(screen.getByText('U')).toBeInTheDocument()
  })
})
