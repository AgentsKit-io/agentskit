import React, { useRef, useEffect, type ReactNode } from 'react'

export interface ChatContainerProps {
  children: ReactNode
  className?: string
}

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
      style={{ overflow: 'auto' }}
    >
      {children}
    </div>
  )
}
