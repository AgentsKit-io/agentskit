import React, { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const RESPONSES = [
  "Great question! Streaming responses work by sending tokens incrementally as they're generated — similar to how large language models produce output token by token. With AgentKit, this is handled automatically via server-sent events or WebSocket, so your UI updates in real time without waiting for the full response.",
  "React hooks are a perfect fit for AI chat UIs. `useChat` from AgentKit wraps state management, streaming, and abort control into a single hook. Internally, it uses `useReducer` for message state and a `ReadableStream` consumer that flushes chunks into the UI on each animation frame.",
  "Tokens are the atomic units LLMs work with — roughly 3–4 characters on average. When you stream a response, each chunk from the API may contain 1–5 tokens. AgentKit batches these into smooth UI updates using `requestAnimationFrame`, keeping the interface responsive even at high token rates.",
  "Context windows define how much text a model can 'see' at once. Claude's context is measured in tokens and includes your entire conversation history. AgentKit automatically manages context by pruning older messages when you approach the limit, so long conversations stay coherent without hitting API errors.",
]

let responseIndex = 0

export function BasicChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: "Hi! I'm your AI assistant. Ask me anything about streaming, React hooks, or how AgentKit works under the hood.",
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingId, setStreamingId] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextIdRef = useRef(1)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const stopStreaming = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsStreaming(false)
    setStreamingId(null)
    setMessages(prev =>
      prev.map(m =>
        m.streaming ? { ...m, streaming: false } : m
      )
    )
  }, [])

  const streamResponse = useCallback((assistantId: number, text: string) => {
    let charIndex = 0
    setIsStreaming(true)
    setStreamingId(assistantId)

    intervalRef.current = setInterval(() => {
      charIndex++
      const chunk = text.slice(0, charIndex)
      const done = charIndex >= text.length

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: chunk, streaming: !done }
            : m
        )
      )

      if (done) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setIsStreaming(false)
        setStreamingId(null)
      }
    }, 18)
  }, [])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return

    const userId = nextIdRef.current++
    const assistantId = nextIdRef.current++

    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])
    setInput('')

    const response = RESPONSES[responseIndex % RESPONSES.length]
    responseIndex++

    // Small delay to feel like the model is "thinking"
    setTimeout(() => streamResponse(assistantId, response), 420)
  }, [input, isStreaming, streamResponse])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: '#0f172a',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        maxWidth: 680,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 520,
      }}
    >
      {/* macOS-style titlebar */}
      <div
        style={{
          background: '#1e293b',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 13,
            color: '#64748b',
            fontWeight: 500,
            letterSpacing: 0.2,
            marginLeft: -55,
          }}
        >
          AgentKit — BasicChat
        </div>
        {isStreaming && (
          <div
            style={{
              fontSize: 11,
              color: '#38bdf8',
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          >
            Streaming...
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          scrollbarWidth: 'thin',
          scrollbarColor: '#334155 transparent',
        }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          padding: '12px 16px',
          background: '#1e293b',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Waiting for response...' : 'Ask something about AI or React...'}
          disabled={isStreaming}
          style={{
            flex: 1,
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s',
            opacity: isStreaming ? 0.5 : 1,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        {isStreaming ? (
          <button
            onClick={stopStreaming}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? '#3b82f6' : '#1e3a5f',
              color: input.trim() ? '#fff' : '#475569',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (input.trim()) e.currentTarget.style.background = '#2563eb'
            }}
            onMouseLeave={e => {
              if (input.trim()) e.currentTarget.style.background = '#3b82f6'
            }}
          >
            Send
          </button>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#475569',
          fontWeight: 500,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          paddingLeft: isUser ? 0 : 4,
          paddingRight: isUser ? 4 : 0,
        }}
      >
        {isUser ? 'You' : 'Assistant'}
      </div>
      <div
        style={{
          maxWidth: '80%',
          background: isUser ? '#2563eb' : '#1e293b',
          color: isUser ? '#fff' : '#cbd5e1',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser
            ? '0 2px 12px rgba(37,99,235,0.3)'
            : '0 2px 8px rgba(0,0,0,0.3)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
        {message.streaming && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: '1em',
              background: '#38bdf8',
              marginLeft: 2,
              verticalAlign: 'text-bottom',
              animation: 'blink 0.8s step-end infinite',
              borderRadius: 1,
            }}
          />
        )}
        {message.streaming && message.content.length === 0 && (
          <span style={{ color: '#475569', fontStyle: 'italic', fontSize: 13 }}>
            Thinking...
          </span>
        )}
      </div>
    </div>
  )
}
