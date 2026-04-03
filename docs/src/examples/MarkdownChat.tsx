import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentType =
  | 'h2'
  | 'paragraph'
  | 'table'
  | 'bullet-list'
  | 'code-inline'
  | 'blockquote'
  | 'recommendation'
  | 'paragraph-rich'

interface Segment {
  type: SegmentType
  content: string
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string | Segment[]
  streaming?: boolean
  visibleSegments?: number
  charProgress?: number
}

// ─── Rich content definitions ─────────────────────────────────────────────────

const RESPONSE_1_SEGMENTS: Segment[] = [
  {
    type: 'h2',
    content: 'React State Management: A Comparison',
  },
  {
    type: 'paragraph',
    content:
      "Choosing the right state management library depends on your app's complexity, team size, and performance needs. Here's a breakdown of the four most popular options in the React ecosystem today.",
  },
  {
    type: 'table',
    content: JSON.stringify({
      headers: ['Library', 'Bundle Size', 'Boilerplate', 'Learning Curve'],
      rows: [
        ['Redux', '~47 kB', 'High', 'Steep'],
        ['Zustand', '~3 kB', 'Low', 'Gentle'],
        ['Jotai', '~8 kB', 'Minimal', 'Easy'],
        ['useReactive', '~1 kB', 'Near-zero', 'Trivial'],
      ],
    }),
  },
  {
    type: 'bullet-list',
    content: JSON.stringify([
      '**Redux** — battle-tested, excellent DevTools, but heavy ceremony for small projects',
      '**Zustand** — minimal API, works outside React components, great for mid-size apps',
      '**Jotai** — atomic model inspired by Recoil, fine-grained reactivity, TypeScript-first',
      '**useReactive** — zero-config reactive state built for AgentKit, no providers needed',
    ]),
  },
  {
    type: 'paragraph-rich',
    content:
      'For most new projects, **Zustand** or **Jotai** hit the sweet spot. Use *Redux* only when you genuinely need time-travel debugging or a large team that already knows it.',
  },
  {
    type: 'code-inline',
    content: 'const store = create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }))',
  },
  {
    type: 'blockquote',
    content:
      '"The best state management library is the one your whole team can reason about at 2am during an incident." — wisdom from production',
  },
]

const RESPONSE_2_SEGMENTS: Segment[] = [
  {
    type: 'h2',
    content: 'Recommendation',
  },
  {
    type: 'paragraph',
    content:
      'Based on the comparison above, here is a concrete decision tree for your next project:',
  },
  {
    type: 'bullet-list',
    content: JSON.stringify([
      "Building with **AgentKit**? → use `useReactive` — zero config, reactive by default",
      'App has **complex async flows**? → Zustand + middleware or Redux Toolkit',
      'Need **atomic fine-grained** updates (e.g., form fields, canvas)? → Jotai',
      "Greenfield project, small team? → Zustand — you'll thank yourself later",
      'Legacy codebase already using Redux? → stay with Redux Toolkit, do not migrate',
    ]),
  },
  {
    type: 'recommendation',
    content:
      "For AgentKit users specifically: `useReactive` ships zero boilerplate and integrates directly with streaming message state — it's the recommended default for AI chat interfaces built with this library.",
  },
]

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} style={{ color: '#f1f5f9', fontWeight: 700 }}>
          {match[2]}
        </strong>
      )
    } else if (match[3]) {
      parts.push(
        <em key={match.index} style={{ color: '#94a3b8', fontStyle: 'italic' }}>
          {match[3]}
        </em>
      )
    } else if (match[4]) {
      parts.push(
        <code
          key={match.index}
          style={{
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 4,
            padding: '1px 5px',
            fontSize: 12,
            color: '#38bdf8',
          }}
        >
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

// ─── Segment renderer ─────────────────────────────────────────────────────────

function SegmentRenderer({ segment }: { segment: Segment }) {
  switch (segment.type) {
    case 'h2':
      return (
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#f1f5f9',
            margin: '0 0 10px 0',
            letterSpacing: -0.3,
            lineHeight: 1.3,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: 8,
          }}
        >
          {segment.content}
        </h2>
      )

    case 'paragraph':
      return (
        <p style={{ margin: '0 0 10px 0', color: '#cbd5e1', lineHeight: 1.7, fontSize: 14 }}>
          {segment.content}
        </p>
      )

    case 'paragraph-rich':
      return (
        <p style={{ margin: '0 0 10px 0', color: '#cbd5e1', lineHeight: 1.7, fontSize: 14 }}>
          {renderInlineMarkdown(segment.content)}
        </p>
      )

    case 'table': {
      const { headers, rows } = JSON.parse(segment.content)
      return (
        <div
          style={{
            overflowX: 'auto',
            margin: '0 0 10px 0',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#cbd5e1' }}>
            <thead>
              <tr style={{ background: 'rgba(30,41,59,0.9)' }}>
                {(headers as string[]).map((h: string, i: number) => (
                  <th
                    key={i}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#94a3b8',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows as string[][]).map((row: string[], ri: number) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  {row.map((cell: string, ci: number) => (
                    <td
                      key={ci}
                      style={{
                        padding: '7px 12px',
                        borderBottom: ri < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        fontWeight: ci === 0 ? 600 : 400,
                        color: ci === 0 ? '#e2e8f0' : '#94a3b8',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'bullet-list': {
      const items: string[] = JSON.parse(segment.content)
      return (
        <ul
          style={{
            margin: '0 0 10px 0',
            paddingLeft: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                fontSize: 14,
                color: '#cbd5e1',
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: '#3b82f6', fontWeight: 700, marginTop: 1, flexShrink: 0, fontSize: 12 }}>
                ▸
              </span>
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      )
    }

    case 'code-inline':
      return (
        <div
          style={{
            margin: '0 0 10px 0',
            background: '#020617',
            border: '1px solid rgba(56,189,248,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Courier New', monospace",
            fontSize: 12.5,
            color: '#38bdf8',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}
        >
          {segment.content}
        </div>
      )

    case 'blockquote':
      return (
        <blockquote
          style={{
            margin: '0 0 10px 0',
            borderLeft: '3px solid #3b82f6',
            paddingLeft: 14,
            color: '#64748b',
            fontSize: 13.5,
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}
        >
          {segment.content}
        </blockquote>
      )

    case 'recommendation':
      return (
        <div
          style={{
            margin: '0 0 10px 0',
            borderLeft: '3px solid #3b82f6',
            background: 'rgba(59,130,246,0.08)',
            borderRadius: '0 8px 8px 0',
            padding: '10px 14px',
            color: '#93c5fd',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {renderInlineMarkdown(segment.content)}
        </div>
      )

    default:
      return null
  }
}

// ─── Streaming segment (char-by-char for text, whole-unit for structural) ─────

function StreamingSegment({
  segment,
  charProgress,
  isLast,
  streaming,
}: {
  segment: Segment
  charProgress?: number
  isLast: boolean
  streaming: boolean
}) {
  const textSegments: SegmentType[] = ['h2', 'paragraph', 'paragraph-rich', 'blockquote', 'code-inline']
  const isTextual = textSegments.includes(segment.type)

  if (isLast && isTextual && streaming && charProgress !== undefined) {
    const partial: Segment = { ...segment, content: segment.content.slice(0, charProgress) }
    return <SegmentRenderer segment={partial} />
  }

  return <SegmentRenderer segment={segment} />
}

// ─── Assistant bubble ─────────────────────────────────────────────────────────

function AssistantMessage({ message }: { message: Message }) {
  const segments = message.content as Segment[]
  const visible = message.visibleSegments ?? segments.length
  const visibleSegs = segments.slice(0, visible)
  const streaming = !!message.streaming

  return (
    <div
      style={{
        maxWidth: '88%',
        background: '#1e293b',
        borderRadius: '16px 16px 16px 4px',
        padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.06)',
        wordBreak: 'break-word',
      }}
    >
      {visibleSegs.map((seg, i) => {
        const isLastVisible = i === visibleSegs.length - 1
        return (
          <StreamingSegment
            key={i}
            segment={seg}
            charProgress={isLastVisible && streaming ? message.charProgress : undefined}
            isLast={isLastVisible}
            streaming={streaming}
          />
        )
      })}
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
      {streaming && visibleSegs.length === 0 && (
        <span style={{ color: '#475569', fontStyle: 'italic', fontSize: 13 }}>Thinking...</span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MarkdownChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [demoComplete, setDemoComplete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nextIdRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const streamSegments = useCallback(
    (assistantId: number, segments: Segment[], onDone?: () => void) => {
      setIsStreaming(true)

      let segIdx = 0
      let charIdx = 0

      const textSegmentTypes: SegmentType[] = [
        'h2', 'paragraph', 'paragraph-rich', 'blockquote', 'code-inline',
      ]

      const tick = () => {
        const seg = segments[segIdx]
        if (!seg) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, streaming: false, visibleSegments: segments.length, charProgress: undefined }
                : m
            )
          )
          setIsStreaming(false)
          onDone?.()
          return
        }

        const isTextual = textSegmentTypes.includes(seg.type)

        if (isTextual) {
          charIdx++
          const done = charIdx >= seg.content.length
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, visibleSegments: segIdx + 1, charProgress: charIdx } : m
            )
          )
          if (done) { segIdx++; charIdx = 0; timerRef.current = setTimeout(tick, 30) }
          else { timerRef.current = setTimeout(tick, 14) }
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, visibleSegments: segIdx + 1, charProgress: undefined } : m
            )
          )
          segIdx++
          charIdx = 0
          timerRef.current = setTimeout(tick, 60)
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, visibleSegments: 0, charProgress: 0 } : m)
      )

      timerRef.current = setTimeout(tick, 80)
    },
    []
  )

  const mkUser = useCallback((text: string) => {
    const id = nextIdRef.current++
    setMessages(prev => [...prev, { id, role: 'user', content: text }])
    return id
  }, [])

  const mkAssistant = useCallback((id: number, segments: Segment[]) => {
    setMessages(prev => [
      ...prev,
      { id, role: 'assistant', content: segments, streaming: true, visibleSegments: 0, charProgress: 0 },
    ])
  }, [])

  useEffect(() => {
    const t1 = setTimeout(() => {
      mkUser('Write a comparison of React state management options')
      const aId1 = nextIdRef.current++
      mkAssistant(aId1, RESPONSE_1_SEGMENTS)
      setTimeout(() => {
        streamSegments(aId1, RESPONSE_1_SEGMENTS, () => {
          timerRef.current = setTimeout(() => {
            mkUser('Now add a recommendation section')
            const aId2 = nextIdRef.current++
            mkAssistant(aId2, RESPONSE_2_SEGMENTS)
            setTimeout(() => {
              streamSegments(aId2, RESPONSE_2_SEGMENTS, () => { setDemoComplete(true) })
            }, 420)
          }, 2000)
        })
      }, 500)
    }, 1000)

    return () => { clearTimeout(t1); clearTimer() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    mkUser(text)
    const aId = nextIdRef.current++
    const replySegments: Segment[] = [
      {
        type: 'paragraph',
        content: `Got it! Here's a follow-up on "${text}". In a real AgentKit integration, this would stream from your AI model via the configured adapter — complete with live markdown rendering as each token arrives.`,
      },
      {
        type: 'recommendation',
        content:
          "Use the `Markdown` component from `@agentkit-react/core` with `streaming={true}` to render partial markdown gracefully as it streams in.",
      },
    ]
    mkAssistant(aId, replySegments)
    setTimeout(() => streamSegments(aId, replySegments), 420)
  }, [input, isStreaming, mkUser, mkAssistant, streamSegments])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    },
    [sendMessage]
  )

  useEffect(() => () => clearTimer(), [])

  const canSend = !!input.trim() && !isStreaming && demoComplete

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: '#0f172a',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 560,
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
          AI Writer
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

      {/* Messages */}
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
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
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
              {isUser ? (
                <div
                  style={{
                    maxWidth: '80%',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '16px 16px 4px 16px',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.6,
                    boxShadow: '0 2px 12px rgba(37,99,235,0.3)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content as string}
                </div>
              ) : (
                <AssistantMessage message={msg} />
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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
          placeholder={
            isStreaming ? 'Waiting for response...' :
            demoComplete ? 'Ask a follow-up question...' : 'Demo playing...'
          }
          disabled={isStreaming || !demoComplete}
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
            opacity: isStreaming || !demoComplete ? 0.5 : 1,
            cursor: !demoComplete ? 'not-allowed' : 'text',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={sendMessage}
          disabled={!canSend}
          style={{
            background: canSend ? '#3b82f6' : '#1e3a5f',
            color: canSend ? '#fff' : '#475569',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: canSend ? 'pointer' : 'default',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (canSend) e.currentTarget.style.background = '#2563eb' }}
          onMouseLeave={e => { if (canSend) e.currentTarget.style.background = '#3b82f6' }}
        >
          Send
        </button>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
