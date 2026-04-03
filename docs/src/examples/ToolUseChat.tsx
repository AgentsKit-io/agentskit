import React, { useState, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToolCallStatus = 'pending' | 'running' | 'done'

interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: ToolCallStatus
  result?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  toolCalls?: ToolCall[]
  streaming?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function streamText(
  text: string,
  onChunk: (partial: string) => void,
  delayMs = 28,
) {
  let partial = ''
  for (const char of text) {
    partial += char
    onChunk(partial)
    await sleep(delayMs)
  }
}

// ---------------------------------------------------------------------------
// ToolCallCard
// ---------------------------------------------------------------------------

interface ToolCallCardProps {
  toolCall: ToolCall
}

function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const borderColor =
    toolCall.status === 'done' ? '#f59e0b' : toolCall.status === 'running' ? '#fbbf24' : '#92400e'

  const statusBadge: Record<ToolCallStatus, React.ReactNode> = {
    pending: (
      <span style={{ color: '#92400e', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
        PENDING
      </span>
    ),
    running: (
      <span
        style={{
          color: '#fbbf24',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <Spinner /> RUNNING
      </span>
    ),
    done: (
      <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
        DONE
      </span>
    ),
  }

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 4,
        background: '#1a1f35',
        overflow: 'hidden',
        maxWidth: 420,
        fontFamily: 'monospace',
        fontSize: 13,
        transition: 'border-color 0.3s',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fbbf24', fontSize: 12 }}>&#9889;</span>
          <span style={{ color: '#fde68a', fontWeight: 700, fontSize: 13 }}>
            {toolCall.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {statusBadge[toolCall.status]}
          <span style={{ color: '#64748b', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${borderColor}`,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: 11, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Arguments
            </div>
            <pre
              style={{
                margin: 0,
                color: '#94a3b8',
                background: '#0f172a',
                borderRadius: 4,
                padding: '6px 10px',
                fontSize: 12,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>

          {toolCall.result && (
            <div>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Result
              </div>
              <div
                style={{
                  color: '#34d399',
                  background: '#0f172a',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                {toolCall.result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  const [frame, setFrame] = useState(0)
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 80)
    return () => clearInterval(id)
  }, [])

  return <span style={{ display: 'inline-block', width: 12 }}>{frames[frame]}</span>
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 14,
      }}
    >
      {/* Role label */}
      <div
        style={{
          fontSize: 11,
          color: '#475569',
          marginBottom: 4,
          fontFamily: 'monospace',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {isUser ? 'You' : 'Assistant'}
      </div>

      {/* Bubble */}
      {message.text && (
        <div
          style={{
            maxWidth: 480,
            padding: '10px 14px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser ? '#3b82f6' : '#1e293b',
            color: '#e2e8f0',
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {message.text}
          {message.streaming && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: 14,
                background: '#94a3b8',
                marginLeft: 2,
                verticalAlign: 'middle',
                animation: 'blink 1s step-end infinite',
              }}
            />
          )}
        </div>
      )}

      {/* Tool call cards */}
      {message.toolCalls?.map(tc => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Titlebar
// ---------------------------------------------------------------------------

function TitleBar() {
  return (
    <div
      style={{
        height: 44,
        background: '#1e293b',
        borderBottom: '1px solid #1e3a5f',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        flexShrink: 0,
        borderRadius: '12px 12px 0 0',
      }}
    >
      {/* macOS dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
          <div
            key={i}
            style={{ width: 12, height: 12, borderRadius: '50%', background: c }}
          />
        ))}
      </div>
      <div style={{ flex: 1, textAlign: 'center', marginRight: 54 }}>
        <span
          style={{
            color: '#64748b',
            fontSize: 13,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 500,
          }}
        >
          AgentKit — Tool Use Demo
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ToolUseChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ranRef = useRef(false)

  // Auto-scroll
  useEffect(() => {
    requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight })
  }, [messages])

  // ---------------------------------------------------------------------------
  // Demo sequence helpers
  // ---------------------------------------------------------------------------

  function addMessage(msg: ChatMessage) {
    setMessages(prev => [...prev, msg])
    return msg.id
  }

  function updateMessage(id: string, updater: (m: ChatMessage) => ChatMessage) {
    setMessages(prev => prev.map(m => (m.id === id ? updater(m) : m)))
  }

  function updateToolCall(msgId: string, tcId: string, updater: (tc: ToolCall) => ToolCall) {
    setMessages(prev =>
      prev.map(m => {
        if (m.id !== msgId) return m
        return {
          ...m,
          toolCalls: m.toolCalls?.map(tc => (tc.id === tcId ? updater(tc) : tc)),
        }
      }),
    )
  }

  async function runWeatherDemo() {
    // 1. User message
    addMessage({ id: uid(), role: 'user', text: "What's the weather in Tokyo?" })
    await sleep(700)

    // 2. Assistant streams preamble
    const aId = uid()
    addMessage({ id: aId, role: 'assistant', text: '', streaming: true })
    await streamText("Let me check that for you...", partial => {
      updateMessage(aId, m => ({ ...m, text: partial }))
    })

    // 3. Attach tool call card (pending → running)
    const tcId = uid()
    updateMessage(aId, m => ({
      ...m,
      streaming: false,
      toolCalls: [
        {
          id: tcId,
          name: 'get_weather',
          args: { city: 'Tokyo' },
          status: 'running',
        },
      ],
    }))

    // Open the card automatically so user sees it
    await sleep(1200)

    // 4. Resolve tool call
    updateToolCall(aId, tcId, tc => ({
      ...tc,
      status: 'done',
      result: 'Tokyo: 22°C, Partly Cloudy',
    }))
    await sleep(600)

    // 5. Stream final response
    const finalText =
      "The weather in Tokyo is currently 22°C and partly cloudy. It's a pleasant day — great for sightseeing!"
    updateMessage(aId, m => ({ ...m, text: m.text + '\n\n', streaming: true }))
    await streamText(finalText, partial => {
      updateMessage(aId, m => ({
        ...m,
        text: (m.text.split('\n\n')[0] + '\n\n' + partial),
      }))
    })
    updateMessage(aId, m => ({ ...m, streaming: false }))
  }

  async function runSearchDemo() {
    await sleep(3000)

    // 1. User message
    addMessage({ id: uid(), role: 'user', text: 'Search for React tutorials' })
    await sleep(700)

    // 2. Assistant starts response
    const aId = uid()
    addMessage({ id: aId, role: 'assistant', text: '', streaming: true })
    await streamText("Sure, searching the web for React tutorials...", partial => {
      updateMessage(aId, m => ({ ...m, text: partial }))
    })

    // 3. Tool call
    const tcId = uid()
    updateMessage(aId, m => ({
      ...m,
      streaming: false,
      toolCalls: [
        {
          id: tcId,
          name: 'web_search',
          args: { query: 'React tutorials beginners 2024' },
          status: 'running',
        },
      ],
    }))
    await sleep(1400)

    // 4. Tool done
    updateToolCall(aId, tcId, tc => ({
      ...tc,
      status: 'done',
      result: '5 results found: react.dev/learn, Scrimba React, freeCodeCamp, Egghead.io, Kent C. Dodds blog',
    }))
    await sleep(600)

    // 5. Final response
    const finalText =
      "Here are the top React tutorial resources I found:\n\n• react.dev/learn — The official React docs with interactive examples\n• Scrimba — Hands-on video courses\n• freeCodeCamp — Free full-length React curriculum\n• Egghead.io — Short focused lessons\n• Kent C. Dodds Blog — Advanced patterns and best practices"
    updateMessage(aId, m => ({ ...m, text: m.text + '\n\n', streaming: true }))
    await streamText(finalText, partial => {
      updateMessage(aId, m => ({
        ...m,
        text: m.text.split('\n\n')[0] + '\n\n' + partial,
      }))
    })
    updateMessage(aId, m => ({ ...m, streaming: false }))
  }

  // ---------------------------------------------------------------------------
  // Auto-play on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function runDemo() {
      setBusy(true)
      await sleep(1000)
      await runWeatherDemo()
      await runSearchDemo()
      setBusy(false)
    }

    runDemo()
  }, [])

  // ---------------------------------------------------------------------------
  // User input
  // ---------------------------------------------------------------------------

  async function handleSend() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)

    addMessage({ id: uid(), role: 'user', text })
    await sleep(600)

    const aId = uid()
    addMessage({ id: aId, role: 'assistant', text: '', streaming: true })
    await streamText(
      "I received your message! In a real AgentKit integration, the configured adapter would process this and may invoke tool calls as needed.",
      partial => {
        updateMessage(aId, m => ({ ...m, text: partial }))
      },
    )
    updateMessage(aId, m => ({ ...m, streaming: false }))
    setBusy(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 12,
        border: '1px solid #1e3a5f',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 540,
        maxWidth: 640,
        margin: '0 auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <TitleBar />

      {/* Messages area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              fontSize: 14,
            }}
          >
            Demo starting…
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          borderTop: '1px solid #1e293b',
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          background: '#0f172a',
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          placeholder={busy ? 'Demo running…' : 'Ask anything…'}
          style={{
            flex: 1,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '9px 14px',
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
            opacity: busy ? 0.5 : 1,
            cursor: busy ? 'not-allowed' : 'text',
          }}
        />
        <button
          onClick={handleSend}
          disabled={busy || !input.trim()}
          style={{
            background: busy || !input.trim() ? '#1e3a5f' : '#3b82f6',
            border: 'none',
            borderRadius: 8,
            padding: '9px 16px',
            color: busy || !input.trim() ? '#475569' : '#fff',
            fontSize: 14,
            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
