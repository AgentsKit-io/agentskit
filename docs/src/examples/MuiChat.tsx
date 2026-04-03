import React, { useState, useRef, useEffect } from 'react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGES: Message[] = [
  { id: 1, role: 'user', content: 'How does AgentKit handle streaming responses?' },
  {
    id: 2,
    role: 'assistant',
    content:
      'AgentKit streams responses token-by-token using the `useChat` hook. As each chunk arrives, the message state updates in real time — no need to manage WebSockets or event streams manually.',
  },
  { id: 3, role: 'user', content: 'Can I use it with any model provider?' },
]

const COLORS = {
  primary: '#1976d2',
  primaryDark: '#1565c0',
  primaryLight: '#e3f2fd',
  paper: '#ffffff',
  background: '#f5f5f5',
  divider: '#e0e0e0',
  textPrimary: '#212121',
  textSecondary: '#757575',
  userAvatar: '#1976d2',
  assistantAvatar: '#43a047',
  ripple: 'rgba(255,255,255,0.3)',
}

const avatarStyle = (bg: string): React.CSSProperties => ({
  width: 36,
  height: 36,
  minWidth: 36,
  borderRadius: '50%',
  backgroundColor: bg,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, sans-serif',
  fontSize: 14,
  fontWeight: 500,
  userSelect: 'none',
})

const messageRowStyle = (role: 'user' | 'assistant'): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  padding: '6px 0',
  justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
})

const bubbleStyle = (role: 'user' | 'assistant'): React.CSSProperties => ({
  maxWidth: '70%',
  backgroundColor: role === 'user' ? COLORS.primaryLight : COLORS.background,
  borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
  padding: '10px 14px',
  fontFamily: 'Roboto, sans-serif',
  fontSize: 14,
  lineHeight: 1.5,
  color: COLORS.textPrimary,
  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
})

function RippleButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const rect = btnRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600)
    onClick()
  }

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: disabled ? '#bdbdbd' : COLORS.primary,
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        padding: '8px 20px',
        fontFamily: 'Roboto, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background-color 0.2s',
        boxShadow: disabled
          ? 'none'
          : '0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = COLORS.primaryDark
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = COLORS.primary
      }}
    >
      {ripples.map(rp => (
        <span
          key={rp.id}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            width: 100,
            height: 100,
            top: rp.y - 50,
            left: rp.x - 50,
            backgroundColor: COLORS.ripple,
            transform: 'scale(0)',
            animation: 'mui-ripple 0.6s linear',
            pointerEvents: 'none',
          }}
        />
      ))}
      {children}
    </button>
  )
}

export function MuiChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(INITIAL_MESSAGES.length + 1)

  useEffect(() => {
    if (listRef.current) {
      requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight })
    }
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
        content: 'This is a simulated MUI response.',
      }
      setMessages(prev => [...prev, assistantMsg])
    }, 600)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const hasInput = input.trim().length > 0
  const labelRaised = focused || input.length > 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        @keyframes mui-ripple {
          to { transform: scale(4); opacity: 0; }
        }
      `}</style>

      {/* Paper container */}
      <div
        style={{
          fontFamily: 'Roboto, sans-serif',
          maxWidth: 560,
          margin: '0 auto',
          borderRadius: 8,
          backgroundColor: COLORS.paper,
          boxShadow:
            '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          height: 480,
          overflow: 'hidden',
        }}
      >
        {/* App bar header */}
        <div
          style={{
            backgroundColor: COLORS.primary,
            color: '#fff',
            padding: '12px 16px',
            fontFamily: 'Roboto, sans-serif',
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: '0.01em',
            flexShrink: 0,
            boxShadow:
              '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
          }}
        >
          AgentKit Chat
        </div>

        {/* Message list */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.map(msg => (
            <div key={msg.id} style={messageRowStyle(msg.role)}>
              {msg.role === 'assistant' && (
                <div style={avatarStyle(COLORS.assistantAvatar)}>A</div>
              )}
              <div style={bubbleStyle(msg.role)}>{msg.content}</div>
              {msg.role === 'user' && (
                <div style={avatarStyle(COLORS.userAvatar)}>U</div>
              )}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: COLORS.divider, flexShrink: 0 }} />

        {/* Input area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            flexShrink: 0,
            backgroundColor: COLORS.paper,
          }}
        >
          {/* MUI-style outlined TextField */}
          <div style={{ flex: 1, position: 'relative' }}>
            <label
              style={{
                position: 'absolute',
                left: 13,
                top: labelRaised ? -10 : 14,
                fontSize: labelRaised ? 12 : 16,
                color: focused ? COLORS.primary : COLORS.textSecondary,
                backgroundColor: labelRaised ? COLORS.paper : 'transparent',
                padding: labelRaised ? '0 4px' : '0',
                pointerEvents: 'none',
                transition: 'all 0.15s ease',
                zIndex: 1,
                fontFamily: 'Roboto, sans-serif',
                lineHeight: 1,
              }}
            >
              Message
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                width: '100%',
                padding: '14px 14px',
                border: `1px solid ${focused ? COLORS.primary : COLORS.divider}`,
                borderRadius: 4,
                fontFamily: 'Roboto, sans-serif',
                fontSize: 16,
                color: COLORS.textPrimary,
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: focused ? `0 0 0 1px ${COLORS.primary}` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                backgroundColor: 'transparent',
              }}
            />
          </div>

          <RippleButton onClick={sendMessage} disabled={!hasInput}>
            Send
          </RippleButton>
        </div>
      </div>
    </>
  )
}
