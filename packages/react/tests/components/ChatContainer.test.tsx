import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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

  it('renders children', () => {
    render(
      <ChatContainer>
        <span>child content</span>
      </ChatContainer>
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('sets up a MutationObserver that scrolls to bottom on DOM changes', async () => {
    let observerCallback: MutationCallback | null = null
    const observeSpy = vi.fn()
    const disconnectSpy = vi.fn()

    const OriginalMutationObserver = globalThis.MutationObserver

    class MockMutationObserver {
      constructor(cb: MutationCallback) {
        observerCallback = cb
      }
      observe = observeSpy
      disconnect = disconnectSpy
    }

    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver

    const { unmount } = render(
      <ChatContainer>
        <div>message</div>
      </ChatContainer>
    )

    expect(observeSpy).toHaveBeenCalled()

    const container = screen.getByTestId('ak-chat-container')
    // Define scrollHeight so we can verify scrollTop gets set
    Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true })

    act(() => {
      observerCallback?.([], {} as MutationObserver)
    })

    expect(container.scrollTop).toBe(500)

    unmount()
    expect(disconnectSpy).toHaveBeenCalled()

    globalThis.MutationObserver = OriginalMutationObserver
  })
})
