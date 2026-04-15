'use client'

import React, { useState, useRef, useEffect } from 'react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGES: Message[] = [
  { id: 1, role: 'assistant', content: 'Hello! How can I help you today?' },
  { id: 2, role: 'user', content: 'Can you help me build a chat UI?' },
  { id: 3, role: 'assistant', content: 'Of course! I can help you build a chat UI. What framework or library are you using?' },
]

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export function ShadcnChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(INITIAL_MESSAGES.length + 1)

  useEffect(() => {
    requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight })
  }, [messages])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return

    const userMsg: Message = { id: nextId.current++, role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      const assistantMsg: Message = {
        id: nextId.current++,
        role: 'assistant',
        content: 'This is a simulated shadcn response',
      }
      setMessages(prev => [...prev, assistantMsg])
    }, 600)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage()
  }

  return (
    <div
      style={{
        fontFamily,
        maxWidth: 560,
        margin: '0 auto',
        borderRadius: 16,
        border: '1px solid #e4e4e7',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'min(480px, 80vh)',
        width: '100%',
        background: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e4e4e7',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#18181b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          A
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#18181b', lineHeight: 1.3 }}>
            Assistant
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.3 }}>Online</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: msg.role === 'user' ? '#18181b' : '#f4f4f5',
                border: msg.role === 'assistant' ? '1px solid #e4e4e7' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: msg.role === 'user' ? '#fff' : '#71717a',
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {msg.role === 'user' ? 'U' : 'A'}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: '70%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? '#18181b' : '#f4f4f5',
                color: msg.role === 'user' ? '#fafafa' : '#18181b',
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid #e4e4e7',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: '#fff',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Message..."
          style={{
            flex: 1,
            height: 36,
            padding: '0 12px',
            fontSize: 14,
            fontFamily,
            border: '1px solid #e4e4e7',
            borderRadius: 8,
            outline: 'none',
            boxShadow: focused ? '0 0 0 2px #18181b' : 'none',
            transition: 'box-shadow 0.15s',
            color: '#18181b',
            background: '#fff',
          }}
        />
        <button
          onClick={sendMessage}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            height: 36,
            padding: '0 14px',
            fontSize: 14,
            fontFamily,
            fontWeight: 500,
            background: '#18181b',
            color: '#fafafa',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            opacity: hovered ? 0.85 : 1,
            transition: 'opacity 0.15s',
            flexShrink: 0,
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}