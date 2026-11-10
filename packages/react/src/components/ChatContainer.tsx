import React, { useRef, useEffect, type ReactNode } from 'react'

/** Props for a chat region that scrolls as its rendered content changes. */
export interface ChatContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Render chat children in a container that scrolls to new content.
 * @param props The container children and optional class name.
 * @returns The chat container element.
 * @example
 * ```tsx
 * <ChatContainer>{messages.map(message => <Message key={message.id} message={message} />)}</ChatContainer>
 * ```
 */
export function ChatContainer({ children, className }: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight
    })

    observer.observe(el, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      data-ak-chat-container=""
      data-testid="ak-chat-container"
      className={className}
    >
      {children}
    </div>
  )
}
