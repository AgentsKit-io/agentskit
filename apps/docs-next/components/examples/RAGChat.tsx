'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Citation {
  id: string
  doc: string
  section: string
  color: string
}

interface MessageSegment {
  type: 'text' | 'citation'
  text?: string
  citation?: Citation
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  segments: MessageSegment[]
  streaming?: boolean
  rawText?: string
}

type Phase = 'idle' | 'searching' | 'streaming' | 'done'

// ─── Data ─────────────────────────────────────────────────────────────────────

const DOCS = [
  { name: 'api-docs.md', size: '12.4 KB', color: '#3b82f6' },
  { name: 'changelog.md', size: '8.1 KB', color: '#22c55e' },
  { name: 'faq.md', size: '5.7 KB', color: '#a855f7' },
]

const CITATIONS: Citation[] = [
  { id: 'c1', doc: 'api-docs.md', section: '§3.2', color: '#3b82f6' },
  { id: 'c2', doc: 'api-docs.md', section: '§3.4', color: '#3b82f6' },
  { id: 'c3', doc: 'faq.md', section: '§1.1', color: '#a855f7' },
]

const DEMO_RESPONSE_SEGMENTS: MessageSegment[] = [
  { type: 'text', text: 'According to ' },
  { type: 'citation', citation: CITATIONS[0] },
  { type: 'text', text: ', you can authenticate with the API using Bearer tokens. Include the header ' },
  { type: 'text', text: '`Authorization: Bearer <your_token>`' },
  { type: 'text', text: ' in every request. Tokens are issued via the ' },
  { type: 'text', text: '`/auth/token`' },
  { type: 'text', text: ' endpoint documented in ' },
  { type: 'citation', citation: CITATIONS[1] },
  { type: 'text', text: '. For OAuth2 flows, the FAQ covers the full handshake in ' },
  { type: 'citation', citation: CITATIONS[2] },
  { type: 'text', text: '. Make sure to store tokens securely and rotate them every 90 days.' },
]

function segmentsToRaw(segs: MessageSegment[]): string {
  return segs.map(s => (s.type === 'text' ? s.text! : `[[${s.citation!.id}]]`)).join('')
}

function parseRaw(raw: string): MessageSegment[] {
  const result: MessageSegment[] = []
  const citationMap = Object.fromEntries(CITATIONS.map(c => [c.id, c]))
  const re = /\[\[(\w+)\]\]/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) result.push({ type: 'text', text: raw.slice(last, match.index) })
    const cit = citationMap[match[1]]
    if (cit) result.push({ type: 'citation', citation: cit })
    last = re.lastIndex
  }
  if (last < raw.length) result.push({ type: 'text', text: raw.slice(last) })
  return result
}

const DEMO_RAW = segmentsToRaw(DEMO_RESPONSE_SEGMENTS)

const FOLLOWUP_RESPONSES: MessageSegment[][] = [
  [
    { type: 'text', text: 'Token expiry is covered in ' },
    { type: 'citation', citation: CITATIONS[1] },
    { type: 'text', text: '. By default, access tokens expire after 3600 seconds. You can request a refresh token at the same `/auth/token` endpoint by passing `grant_type=refresh_token`.' },
  ],
  [
    { type: 'text', text: 'Rate limits are detailed in ' },
    { type: 'citation', citation: CITATIONS[0] },
    { type: 'text', text: '. The default tier allows 100 requests per minute. Enterprise plans have higher limits — check ' },
    { type: 'citation', citation: CITATIONS[2] },
    { type: 'text', text: ' for upgrade options.' },
  ],
]

let followupIndex = 0

// ─── Sub-components ───────────────────────────────────────────────────────────

function CitationPill({ citation }: { citation: Citation }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: hovered ? citation.color : `${citation.color}22`,
        color: hovered ? '#fff' : citation.color,
        border: `1px solid ${citation.color}66`,
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        verticalAlign: 'middle',
        lineHeight: 1.6,
        userSelect: 'none',
        margin: '0 2px',
      }}
      title={`Source: ${citation.doc} ${citation.section}`}
    >
      {citation.doc} {citation.section}
    </span>
  )
}

function SegmentedText({ segments, streaming }: { segments: MessageSegment[]; streaming?: boolean }) {
  return (
    <span style={{ lineHeight: 1.7 }}>
      {segments.map((seg, i) =>
        seg.type === 'citation' ? (
          <CitationPill key={`cit-${i}`} citation={seg.citation!} />
        ) : (
          <span key={`txt-${i}`}>{seg.text}</span>
        )
      )}
      {streaming && (
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
    </span>
  )
}

function SearchingIndicator() {
  const [dots, setDots] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 400)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, fontStyle: 'italic', padding: '2px 0' }}>
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          border: '2px solid #f59e0b',
          borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }}
      />
      Searching documents{'.'.repeat(dots)}
    </div>
  )
}

function MessageBubble({ message, phase }: { message: Message; phase: Phase }) {
  const isUser = message.role === 'user'
  const showSearch = !isUser && phase === 'searching' && message.segments.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4 }}>
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
          maxWidth: '88%',
          background: isUser ? '#2563eb' : '#1e293b',
          color: isUser ? '#fff' : '#cbd5e1',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser ? '0 2px 12px rgba(37,99,235,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
          wordBreak: 'break-word',
        }}
      >
        {showSearch ? (
          <SearchingIndicator />
        ) : message.segments.length > 0 ? (
          <SegmentedText segments={message.segments} streaming={message.streaming} />
        ) : message.streaming ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  )
}

function DocItem({ doc }: { doc: typeof DOCS[number] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 7,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <svg width="13" height="15" viewBox="0 0 13 15" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 0.5h6l4 4v10h-10z" fill={`${doc.color}18`} stroke={doc.color} strokeWidth="0.9" />
        <path d="M7.5 0.5v4h4" stroke={doc.color} strokeWidth="0.9" fill="none" />
        <rect x="3.5" y="7" width="6" height="0.9" rx="0.45" fill={doc.color} opacity="0.55" />
        <rect x="3.5" y="9.2" width="5" height="0.9" rx="0.45" fill={doc.color} opacity="0.38" />
        <rect x="3.5" y="11.4" width="3.5" height="0.9" rx="0.45" fill={doc.color} opacity="0.25" />
      </svg>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{doc.size}</div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RAGChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      segments: [
        {
          type: 'text',
          text: "Hi! I'm connected to your knowledge base. Ask me anything about the API, recent changes, or common questions.",
        },
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nextIdRef = useRef(1)
  const demoFiredRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const streamSegments = useCallback((assistantId: number, rawText: string) => {
    let charIndex = 0
    setPhase('streaming')

    intervalRef.current = setInterval(() => {
      charIndex += 2
      const chunk = rawText.slice(0, charIndex)
      const done = charIndex >= rawText.length

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, segments: parseRaw(chunk), streaming: !done, rawText: chunk }
            : m
        )
      )

      if (done) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setPhase('idle')
      }
    }, 22)
  }, [])

  const runQuery = useCallback(
    (userText: string, responseRaw: string) => {
      const userId = nextIdRef.current++
      const assistantId = nextIdRef.current++

      setMessages(prev => [
        ...prev,
        { id: userId, role: 'user', segments: [{ type: 'text', text: userText }] },
        { id: assistantId, role: 'assistant', segments: [], streaming: true, rawText: '' },
      ])

      setPhase('searching')

      setTimeout(() => {
        streamSegments(assistantId, responseRaw)
      }, 1600)
    },
    [streamSegments]
  )

  useEffect(() => {
    if (demoFiredRef.current) return
    demoFiredRef.current = true
    const t = setTimeout(() => {
      runQuery('How do I authenticate with the API?', DEMO_RAW)
    }, 1500)
    return () => clearTimeout(t)
  }, [runQuery])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || phase !== 'idle') return
    setInput('')

    const segs = FOLLOWUP_RESPONSES[followupIndex % FOLLOWUP_RESPONSES.length]
    followupIndex++
    runQuery(text, segmentsToRaw(segs))
  }, [input, phase, runQuery])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    },
    []
  )

  const isActive = phase !== 'idle'

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: '#0f172a',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        maxWidth: 780,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 'min(560px, 80vh)',
        width: '100%',
      }}
    >
      {/* Titlebar */}
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
          Knowledge Base Chat
        </div>
        {phase === 'searching' && (
          <div
            style={{
              fontSize: 11,
              color: '#f59e0b',
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          >
            Searching...
          </div>
        )}
        {phase === 'streaming' && (
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

      {/* Body: sidebar + chat */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            flex: '1 1 200px',
            minWidth: 200,
            maxWidth: '100%',
            background: '#0d1b2e',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 10px',
            gap: 8,
          }}
        >
          <div
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 6,
              padding: '5px 8px',
              fontSize: 11,
              color: '#93c5fd',
              fontWeight: 600,
              textAlign: 'center',
              letterSpacing: 0.2,
              marginBottom: 2,
            }}
          >
            Context: 3 documents loaded
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#334155',
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              paddingLeft: 2,
              marginBottom: 2,
            }}
          >
            Loaded Documents
          </div>
          {DOCS.map(doc => (
            <DocItem key={doc.name} doc={doc} />
          ))}
        </div>

        {/* Chat pane */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              scrollbarWidth: 'thin',
              scrollbarColor: '#334155 transparent',
            }}
          >
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} phase={phase} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div
            style={{
              padding: '10px 14px',
              background: '#1e293b',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isActive
                  ? phase === 'searching'
                    ? 'Searching documents...'
                    : 'Receiving response...'
                  : 'Ask about your documents...'
              }
              disabled={isActive}
              style={{
                flex: 1,
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '9px 13px',
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.15s',
                opacity: isActive ? 0.5 : 1,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              onClick={sendMessage}
              disabled={isActive || !input.trim()}
              style={{
                background: !isActive && input.trim() ? '#3b82f6' : '#1e3a5f',
                color: !isActive && input.trim() ? '#fff' : '#475569',
                border: 'none',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: !isActive && input.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive && input.trim()) e.currentTarget.style.background = '#2563eb'
              }}
              onMouseLeave={e => {
                if (!isActive && input.trim()) e.currentTarget.style.background = '#3b82f6'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}