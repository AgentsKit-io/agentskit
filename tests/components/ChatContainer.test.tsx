import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ChatContainer } from '../../src/components/ChatContainer'

describe('ChatContainer', () => {
  it('renders a scrollable container with data-ak-chat-container attribute', () => {
    render(
      <ChatContainer>
        <div>message</div>
      </ChatContainer>
    )
    const container = screen.getByTestId('ak-chat-container')
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute('data-ak-chat-container')
  })

  it('accepts and applies className prop', () => {
    render(
      <ChatContainer className="custom-class">
        <div>message</div>
      </ChatContainer>
    )
    const container = screen.getByTestId('ak-chat-container')
    expect(container).toHaveClass('custom-class')
  })
})
