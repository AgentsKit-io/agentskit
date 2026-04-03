import React, { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Syntax highlighting helpers
// ---------------------------------------------------------------------------

type TokenType = 'keyword' | 'type' | 'string' | 'comment' | 'plain'

interface Token {
  text: string
  type: TokenType
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'new', 'typeof', 'void', 'null', 'undefined', 'true', 'false', 'export',
  'import', 'from', 'default', 'async', 'await', 'class', 'extends',
  'interface', 'type', 'implements', 'readonly', 'private', 'public',
])

const TS_TYPES = new Set([
  'number', 'string', 'boolean', 'any', 'never', 'unknown', 'void',
  'Promise', 'Array', 'Record', 'Partial', 'Required', 'Readonly',
  'ReturnType', 'Parameters', 'T', 'K', 'V',
])

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []

  // Handle full-line comments
  const trimmed = line.trimStart()
  if (trimmed.startsWith('//')) {
    tokens.push({ text: line, type: 'comment' })
    return tokens
  }

  // Simple character-by-character tokenizer
  let i = 0
  while (i < line.length) {
    // Inline comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' })
      break
    }

    // String literals
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i]
      let j = i + 1
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++ // skip escape
        j++
      }
      j++ // closing quote
      tokens.push({ text: line.slice(i, j), type: 'string' })
      i = j
      continue
    }

    // Word (identifier / keyword / type)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++
      const word = line.slice(i, j)
      const type: TokenType = KEYWORDS.has(word)
        ? 'keyword'
        : TS_TYPES.has(word)
        ? 'type'
        : 'plain'
      tokens.push({ text: word, type })
      i = j
      continue
    }

    // Plain character
    tokens.push({ text: line[i], type: 'plain' })
    i++
  }

  return tokens
}

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: '#60a5fa',   // blue
  type:    '#c084fc',   // purple
  string:  '#4ade80',   // green
  comment: '#6b7280',   // gray
  plain:   '#e2e8f0',   // near-white
}

function HighlightedCode({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <>
      {lines.map((line, li) => (
        <div key={li} style={{ minHeight: '1.4em' }}>
          {tokenizeLine(line).map((tok, ti) => (
            <span key={ti} style={{ color: TOKEN_COLORS[tok.type] }}>
              {tok.text}
            </span>
          ))}
        </div>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Chat data / scripts
// ---------------------------------------------------------------------------

const DEBOUNCE_CODE = `function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function (...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}`

const USAGE_CODE = `// Example usage
const debouncedSearch = debounce(async (query: string) => {
  const results = await fetchSearchResults(query)
  setResults(results)
}, 300)

// Call it on every keystroke — the API fires only after 300 ms of silence
input.addEventListener('input', (e) => debouncedSearch(e.target.value))`

const IMPROVED_CODE = `function debounce<
  T extends (...args: Parameters<T>) => ReturnType<T>
>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function (...args: Parameters<T>): void {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

// Promise-returning variant with generic return type
function debounceAsync<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args) =>
    new Promise((resolve, reject) => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        Promise.resolve(fn(...args)).then(resolve).catch(reject)
        timer = null
      }, delay)
    })
}`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'user' | 'assistant'

interface CodeBlockData {
  language: string
  code: string
}

interface Segment {
  kind: 'text' | 'code'
  content: string
  language?: string
}

interface Message {
  id: number
  role: Role
  /** Fully committed segments */
  segments: Segment[]
  /** Segment currently being streamed */
  streamingSegment?: { kind: 'text' | 'code'; content: string; language?: string }
  done: boolean
}

// ---------------------------------------------------------------------------
// Streaming engine
// ---------------------------------------------------------------------------

type StreamStep =
  | { type: 'text'; char: string }
  | { type: 'codeStart'; language: string }
  | { type: 'codeChar'; char: string }
  | { type: 'codeEnd' }
  | { type: 'done' }

function buildStream(parts: Array<{ kind: 'text' | 'code'; content: string; language?: string }>): StreamStep[] {
  const steps: StreamStep[] = []
  for (const part of parts) {
    if (part.kind === 'text') {
      for (const char of part.content) steps.push({ type: 'text', char })
    } else {
      steps.push({ type: 'codeStart', language: part.language ?? '' })
      for (const char of part.content) steps.push({ type: 'codeChar', char })
      steps.push({ type: 'codeEnd' })
    }
  }
  steps.push({ type: 'done' })
  return steps
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      style={{
        background: 'transparent',
        border: '1px solid #334155',
        borderRadius: 4,
        color: copied ? '#4ade80' : '#94a3b8',
        cursor: 'pointer',
        fontSize: 11,
        padding: '2px 8px',
        transition: 'color 0.2s',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// CodeBlock component
// ---------------------------------------------------------------------------

function CodeBlock({ language, code, streaming }: CodeBlockData & { streaming?: boolean }) {
  return (
    <div
      style={{
        background: '#020617',
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 8,
        overflow: 'hidden',
        border: '1px solid #1e293b',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <span style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>
          {language}
        </span>
        <CopyButton code={code} />
      </div>

      {/* Code body */}
      <pre
        style={{
          margin: 0,
          padding: '12px 16px',
          fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
          fontSize: 13,
          lineHeight: 1.6,
          overflowX: 'auto',
          tabSize: 2,
        }}
      >
        <HighlightedCode code={code} />
        {streaming && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: '1em',
              background: '#60a5fa',
              marginLeft: 1,
              animation: 'blink 1s step-start infinite',
            }}
          />
        )}
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const allSegments: Segment[] = msg.streamingSegment
    ? [...msg.segments, msg.streamingSegment]
    : msg.segments
  const isStreamingCode =
    !msg.done && msg.streamingSegment?.kind === 'code'
  const isStreamingText =
    !msg.done && msg.streamingSegment?.kind === 'text'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        padding: '0 16px',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            flexShrink: 0,
            marginRight: 8,
            marginTop: 4,
          }}
        >
          ✦
        </div>
      )}

      <div style={{ maxWidth: '80%' }}>
        {isUser ? (
          <div
            style={{
              background: '#3b82f6',
              borderRadius: '18px 18px 4px 18px',
              color: '#fff',
              fontSize: 14,
              lineHeight: 1.5,
              padding: '10px 14px',
            }}
          >
            {allSegments.map((s) => s.content).join('')}
            {isStreamingText && (
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: '1em',
                  background: 'rgba(255,255,255,0.7)',
                  marginLeft: 1,
                  animation: 'blink 1s step-start infinite',
                  verticalAlign: 'middle',
                }}
              />
            )}
          </div>
        ) : (
          <div
            style={{
              background: '#1e293b',
              borderRadius: '18px 18px 18px 4px',
              color: '#e2e8f0',
              fontSize: 14,
              lineHeight: 1.6,
              padding: '12px 14px',
            }}
          >
            {allSegments.map((seg, i) => {
              const isLast = i === allSegments.length - 1
              const streamingThisSegment = isLast && !msg.done && !!msg.streamingSegment
              if (seg.kind === 'text') {
                return (
                  <span key={i}>
                    {seg.content}
                    {streamingThisSegment && isStreamingText && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 2,
                          height: '1em',
                          background: '#60a5fa',
                          marginLeft: 1,
                          animation: 'blink 1s step-start infinite',
                          verticalAlign: 'middle',
                        }}
                      />
                    )}
                  </span>
                )
              }
              return (
                <CodeBlock
                  key={i}
                  language={seg.language ?? ''}
                  code={seg.content}
                  streaming={streamingThisSegment && isStreamingCode}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          flexShrink: 0,
          marginRight: 8,
        }}
      >
        ✦
      </div>
      <div
        style={{
          background: '#1e293b',
          borderRadius: '18px 18px 18px 4px',
          padding: '12px 16px',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#475569',
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CHAR_DELAY_TEXT = 18   // ms per character for text
const CHAR_DELAY_CODE = 10   // ms per character for code

export function CodeAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [demoPhase, setDemoPhase] = useState(0) // 0 = waiting, 1 = q1 sent, 2 = a1 done, 3 = q2 sent, 4 = done
  const bottomRef = useRef<HTMLDivElement>(null)
  const streamCancel = useRef(false)
  const nextId = useRef(1)

  const getId = () => nextId.current++

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ---- Streaming helper ----
  const streamMessage = useCallback(
    (
      role: Role,
      parts: Array<{ kind: 'text' | 'code'; content: string; language?: string }>,
      onDone?: () => void
    ) => {
      const id = getId()
      streamCancel.current = false

      // Insert empty message
      setMessages((prev) => [
        ...prev,
        { id, role, segments: [], done: false },
      ])

      const steps = buildStream(parts)
      let stepIdx = 0
      let currentKind: 'text' | 'code' | null = null
      let currentContent = ''
      let currentLang = ''

      const flush = (done: boolean) => {
        if (currentKind === null) return
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== id) return m
            const seg: Segment = {
              kind: currentKind!,
              content: currentContent,
              language: currentLang || undefined,
            }
            if (done) {
              return { ...m, segments: [...m.segments, seg], streamingSegment: undefined, done: true }
            }
            return { ...m, streamingSegment: seg }
          })
        )
      }

      const commitCurrent = () => {
        if (currentKind === null) return
        const seg: Segment = {
          kind: currentKind,
          content: currentContent,
          language: currentLang || undefined,
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id !== id
              ? m
              : { ...m, segments: [...m.segments, seg], streamingSegment: undefined }
          )
        )
        currentKind = null
        currentContent = ''
        currentLang = ''
      }

      const tick = () => {
        if (streamCancel.current) return
        if (stepIdx >= steps.length) return

        const step = steps[stepIdx++]

        if (step.type === 'done') {
          flush(true)
          setIsTyping(false)
          onDone?.()
          return
        }

        if (step.type === 'text') {
          if (currentKind !== 'text') {
            commitCurrent()
            currentKind = 'text'
            currentContent = ''
            currentLang = ''
          }
          currentContent += step.char
          flush(false)
        } else if (step.type === 'codeStart') {
          commitCurrent()
          currentKind = 'code'
          currentContent = ''
          currentLang = step.language
        } else if (step.type === 'codeChar') {
          currentContent += step.char
          flush(false)
        } else if (step.type === 'codeEnd') {
          commitCurrent()
        }

        const delay =
          step.type === 'codeChar' ? CHAR_DELAY_CODE : CHAR_DELAY_TEXT
        setTimeout(tick, delay)
      }

      setTimeout(tick, 0)
    },
    []
  )

  // ---- Demo sequence ----

  // Phase 0 -> send first user message after 1s
  useEffect(() => {
    if (demoPhase !== 0) return
    const t = setTimeout(() => {
      const id = getId()
      setMessages([{
        id,
        role: 'user',
        segments: [{ kind: 'text', content: 'Write a function to debounce API calls in TypeScript' }],
        done: true,
      }])
      setDemoPhase(1)
    }, 1000)
    return () => clearTimeout(t)
  }, [demoPhase])

  // Phase 1 -> assistant streams first response
  useEffect(() => {
    if (demoPhase !== 1) return
    const t = setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        streamMessage(
          'assistant',
          [
            {
              kind: 'text',
              content:
                'Sure! Here\'s a clean, reusable debounce utility for TypeScript. It delays invoking a function until after a specified wait time has elapsed since the last call — perfect for rate-limiting API requests triggered by user input.\n\n',
            },
            { kind: 'code', language: 'TypeScript', content: DEBOUNCE_CODE },
            {
              kind: 'text',
              content: '\n\nHere\'s how to use it:\n\n',
            },
            { kind: 'code', language: 'TypeScript', content: USAGE_CODE },
            {
              kind: 'text',
              content:
                '\n\nThe debounce fires only after the user stops typing for `delay` milliseconds, keeping your API quota safe.',
            },
          ],
          () => setDemoPhase(2)
        )
      }, 900)
    }, 400)
    return () => clearTimeout(t)
  }, [demoPhase, streamMessage])

  // Phase 2 -> send second user message after 3s
  useEffect(() => {
    if (demoPhase !== 2) return
    const t = setTimeout(() => {
      const id = getId()
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: 'user',
          segments: [{ kind: 'text', content: 'Add generic types to it' }],
          done: true,
        },
      ])
      setDemoPhase(3)
    }, 3000)
    return () => clearTimeout(t)
  }, [demoPhase])

  // Phase 3 -> assistant streams improved version
  useEffect(() => {
    if (demoPhase !== 3) return
    const t = setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        streamMessage(
          'assistant',
          [
            {
              kind: 'text',
              content:
                'Great call! Here\'s the improved version with stricter generic constraints and a bonus `debounceAsync` variant for Promise-returning functions:\n\n',
            },
            { kind: 'code', language: 'TypeScript', content: IMPROVED_CODE },
            {
              kind: 'text',
              content:
                '\n\nThe key improvement is constraining `T` to `(...args: Parameters<T>) => ReturnType<T>`, which gives you full type inference on both the arguments and the return value — no more `unknown[]` fallback.',
            },
          ],
          () => setDemoPhase(4)
        )
      }, 800)
    }, 400)
    return () => clearTimeout(t)
  }, [demoPhase, streamMessage])

  // ---- User-initiated send ----
  const send = () => {
    const text = input.trim()
    if (!text || isTyping) return
    const id = getId()
    setMessages((prev) => [
      ...prev,
      { id, role: 'user', segments: [{ kind: 'text', content: text }], done: true },
    ])
    setInput('')
    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        streamMessage('assistant', [
          {
            kind: 'text',
            content:
              'That\'s a great question! In a real AgentKit integration, the AI would respond here — streaming tokens directly into the `CodeBlock` and `Markdown` components as they arrive from the model.',
          },
        ])
      }, 1000)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      <div
        style={{
          background: '#0f172a',
          borderRadius: 12,
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          height: 600,
          margin: '0 auto',
          maxWidth: 760,
          overflow: 'hidden',
          border: '1px solid #1e293b',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            alignItems: 'center',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            flexShrink: 0,
            gap: 8,
            padding: '10px 16px',
          }}
        >
          {/* macOS-style traffic lights */}
          {['#ff5f57', '#febc2e', '#28c840'].map((color, i) => (
            <div
              key={i}
              style={{
                background: color,
                borderRadius: '50%',
                height: 12,
                width: 12,
              }}
            />
          ))}
          <span
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 600,
              marginLeft: 8,
              letterSpacing: '0.01em',
            }}
          >
            Code Assistant
          </span>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: 16,
            paddingBottom: 8,
            scrollbarWidth: 'thin',
            scrollbarColor: '#334155 transparent',
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: '#475569',
                fontSize: 14,
                textAlign: 'center',
                marginTop: 60,
              }}
            >
              Starting demo…
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          style={{
            alignItems: 'center',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            flexShrink: 0,
            gap: 8,
            padding: '10px 16px',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about code…"
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#e2e8f0',
              flex: 1,
              fontSize: 14,
              outline: 'none',
              padding: '9px 12px',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isTyping}
            style={{
              alignItems: 'center',
              background: input.trim() && !isTyping ? '#3b82f6' : '#1e3a5f',
              border: 'none',
              borderRadius: 8,
              color: input.trim() && !isTyping ? '#fff' : '#475569',
              cursor: input.trim() && !isTyping ? 'pointer' : 'default',
              display: 'flex',
              fontSize: 18,
              height: 38,
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
              width: 38,
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  )
}
