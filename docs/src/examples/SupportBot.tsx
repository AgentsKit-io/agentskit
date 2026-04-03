import React, { useState, useEffect, useRef } from 'react'

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

type MessageRole = 'user' | 'assistant'

interface ChatMessage {
  id: number
  role: MessageRole
  content: string | React.ReactNode
  createdAt: Date
}

type BotState = 'idle' | 'typing' | 'streaming'
type Flow = 'none' | 'track-order' | 'return-policy' | 'talk-human'

function formatTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'now'
  if (diffMin === 1) return '1m ago'
  return `${diffMin}m ago`
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#94a3b8',
            display: 'inline-block',
            animation: `agentkit-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes agentkit-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes agentkit-pulse-ring {
          0% { transform: scale(0.9); opacity: 1; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </span>
  )
}

function EscalationCard() {
  return (
    <div
      style={{
        marginTop: 10,
        padding: '12px 14px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#22c55e',
            opacity: 0.3,
            animation: 'agentkit-pulse-ring 1.5s cubic-bezier(0.215,0.61,0.355,1) infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Connecting...</div>
        <div style={{ fontSize: 12, color: '#4ade80', marginTop: 1 }}>Expected wait: ~2 minutes</div>
      </div>
    </div>
  )
}

function OrderNumberInput() {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return submitted ? (
    <div
      style={{
        marginTop: 10,
        padding: '10px 12px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        fontSize: 13,
        color: '#1d4ed8',
      }}
    >
      Looking up order <strong>#{value}</strong>...
    </div>
  ) : (
    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && value.trim() && setSubmitted(true)}
        placeholder="e.g. ACM-12345"
        style={{
          flex: 1,
          height: 34,
          padding: '0 10px',
          fontSize: 13,
          fontFamily,
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          outline: 'none',
          color: '#1e293b',
          background: '#fff',
        }}
      />
      <button
        onClick={() => value.trim() && setSubmitted(true)}
        style={{
          height: 34,
          padding: '0 12px',
          fontSize: 13,
          fontFamily,
          fontWeight: 500,
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Look up
      </button>
    </div>
  )
}

function ReturnPolicyContent() {
  return (
    <div style={{ lineHeight: 1.6 }}>
      <div style={{ marginBottom: 6 }}>Our return policy is designed to be hassle-free:</div>
      <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
        <li>30-day returns from date of delivery</li>
        <li>Items must be unused and in original packaging</li>
        <li>Free return shipping on all orders over $50</li>
        <li>Refunds processed within 3–5 business days</li>
        <li>Exchanges available for size / colour changes</li>
      </ul>
    </div>
  )
}

const QUICK_REPLIES = ['Track my order', 'Return policy', 'Talk to human'] as const

const BOT_RESPONSES: Record<typeof QUICK_REPLIES[number], { text: string; extra?: React.ReactNode }> = {
  'Track my order': {
    text: "I'd be happy to help track your order! Please provide your order number and I'll look it up right away.",
    extra: <OrderNumberInput />,
  },
  'Return policy': {
    text: '',
    extra: <ReturnPolicyContent />,
  },
  'Talk to human': {
    text: "I'll connect you with a support agent. Expected wait time: ~2 minutes.",
    extra: <EscalationCard />,
  },
}

export function SupportBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [botState, setBotState] = useState<BotState>('idle')
  const [input, setInput] = useState('')
  const [quickRepliesUsed, setQuickRepliesUsed] = useState(false)
  const [focused, setFocused] = useState(false)
  const [sendHovered, setSendHovered] = useState(false)
  const [activeFlow, setActiveFlow] = useState<Flow>('none')
  const [, setTick] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  // Refresh timestamps every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Greeting on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          id: nextId.current++,
          role: 'assistant',
          content: "Hi! I'm Acme's support assistant. How can I help you today?",
          createdAt: new Date(),
        },
      ])
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, botState])

  function addBotMessage(content: string | React.ReactNode) {
    setMessages(prev => [
      ...prev,
      { id: nextId.current++, role: 'assistant', content, createdAt: new Date() },
    ])
  }

  function addUserMessage(text: string) {
    setMessages(prev => [
      ...prev,
      { id: nextId.current++, role: 'user', content: text, createdAt: new Date() },
    ])
  }

  function streamBotResponse(key: typeof QUICK_REPLIES[number]) {
    const { text, extra } = BOT_RESPONSES[key]
    setBotState('typing')

    setTimeout(() => {
      setBotState('streaming')

      // For return policy, skip char-by-char streaming and just show the JSX
      if (!text) {
        addBotMessage(extra ?? '')
        setBotState('idle')
        return
      }

      let i = 0
      const streamId = nextId.current++
      setMessages(prev => [
        ...prev,
        { id: streamId, role: 'assistant', content: '', createdAt: new Date() },
      ])

      const interval = setInterval(() => {
        i++
        const partial = text.slice(0, i)
        const isLast = i >= text.length
        setMessages(prev =>
          prev.map(m =>
            m.id === streamId
              ? {
                  ...m,
                  content: isLast ? (
                    <span>
                      {text}
                      {extra && <>{extra}</>}
                    </span>
                  ) : (
                    partial
                  ),
                }
              : m
          )
        )
        if (isLast) {
          clearInterval(interval)
          setBotState('idle')
        }
      }, 18)
    }, 1000)
  }

  function handleQuickReply(label: typeof QUICK_REPLIES[number]) {
    if (botState !== 'idle') return
    setQuickRepliesUsed(true)
    addUserMessage(label)
    streamBotResponse(label)
    if (label === 'Talk to human') setActiveFlow('talk-human')
    if (label === 'Track my order') setActiveFlow('track-order')
    if (label === 'Return policy') setActiveFlow('return-policy')
  }

  function handleSend() {
    const text = input.trim()
    if (!text || botState !== 'idle') return
    addUserMessage(text)
    setInput('')
    setBotState('typing')
    setTimeout(() => {
      setBotState('idle')
      addBotMessage(
        activeFlow === 'talk-human'
          ? 'Our agent will be right with you. Please stay connected!'
          : "Got it! Let me look into that for you. Is there anything else I can help with in the meantime?"
      )
    }, 1200)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div
      style={{
        fontFamily,
        maxWidth: 520,
        margin: '0 auto',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow:
          '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 540,
        background: '#f8fafc',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#ffffff',
        }}
      >
        {/* Logo / Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0,
            letterSpacing: '-0.5px',
          }}
        >
          A
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
            AcmeCo Support
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#22c55e',
                flexShrink: 0,
              }}
            />
            Typically replies in &lt; 1 min
          </div>
        </div>

        <div
          style={{
            padding: '4px 10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            color: '#15803d',
            letterSpacing: '0.02em',
          }}
        >
          Online
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
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
            {/* Bot avatar */}
            {msg.role === 'assistant' && (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                A
              </div>
            )}

            <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 3 }}>
              <div
                style={{
                  padding: '9px 13px',
                  borderRadius:
                    msg.role === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? '#2563eb' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                  fontSize: 14,
                  lineHeight: 1.55,
                  wordBreak: 'break-word',
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  boxShadow:
                    msg.role === 'assistant'
                      ? '0 1px 2px rgba(0,0,0,0.05)'
                      : 'none',
                }}
              >
                {msg.content}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 2, paddingRight: 2 }}>
                {formatTime(msg.createdAt)}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {botState === 'typing' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              A
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <TypingDots />
            </div>
          </div>
        )}

        {/* Quick replies (shown after greeting, before first use) */}
        {!quickRepliesUsed && messages.length > 0 && botState === 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4, paddingLeft: 38 }}>
            {QUICK_REPLIES.map(label => (
              <button
                key={label}
                onClick={() => handleQuickReply(label)}
                style={{
                  padding: '6px 13px',
                  fontSize: 13,
                  fontFamily,
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#2563eb',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: 20,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  ;(e.target as HTMLButtonElement).style.background = '#eff6ff'
                  ;(e.target as HTMLButtonElement).style.borderColor = '#93c5fd'
                }}
                onMouseLeave={e => {
                  ;(e.target as HTMLButtonElement).style.background = '#ffffff'
                  ;(e.target as HTMLButtonElement).style.borderColor = '#bfdbfe'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '11px 14px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: '#ffffff',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Type a message..."
          disabled={botState !== 'idle'}
          style={{
            flex: 1,
            height: 38,
            padding: '0 12px',
            fontSize: 14,
            fontFamily,
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
            borderColor: focused ? '#93c5fd' : '#e2e8f0',
            transition: 'box-shadow 0.15s, border-color 0.15s',
            color: '#1e293b',
            background: botState !== 'idle' ? '#f8fafc' : '#fff',
          }}
        />
        <button
          onClick={handleSend}
          disabled={botState !== 'idle' || !input.trim()}
          onMouseEnter={() => setSendHovered(true)}
          onMouseLeave={() => setSendHovered(false)}
          style={{
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              botState !== 'idle' || !input.trim()
                ? '#e2e8f0'
                : sendHovered
                ? '#1d4ed8'
                : '#2563eb',
            color: botState !== 'idle' || !input.trim() ? '#94a3b8' : '#fff',
            border: 'none',
            borderRadius: 10,
            cursor:
              botState !== 'idle' || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
