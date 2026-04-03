import React, { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface PanelState {
  messages: Message[]
  streaming: boolean
}

const COLORS = {
  bg: '#0d1117',
  panel: '#161b22',
  titlebar: '#1c2128',
  border: '#30363d',
  inputBg: '#0d1117',
  inputBorder: '#30363d',
  inputFocusBorder: '#58a6ff',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  userBubble: '#1f3a5f',
  claudeBubble: '#1a2332',
  gptBubble: '#1a2d1a',
  claudeDot: '#a855f7',
  gptDot: '#22c55e',
  cursor: '#e6edf3',
  buttonBg: '#21262d',
  buttonHover: '#30363d',
  buttonActive: '#388bfd',
}

const CLAUDE_RESPONSES: Record<string, string> = {
  default:
    'React hooks are a fundamental paradigm shift introduced in React 16.8 that allow functional components to manage state and side effects — capabilities previously exclusive to class components. The useState hook provides a way to declare reactive state variables alongside their setter functions, triggering re-renders when values change. The useEffect hook handles lifecycle concerns such as data fetching, subscriptions, and DOM mutations by running after renders and optionally cleaning up on unmount or dependency change. Additional hooks like useContext, useReducer, useMemo, and useCallback address more nuanced concerns around shared state, complex state transitions, referential equality, and performance optimization. Collectively, hooks encourage composability: you can extract stateful logic into custom hooks and reuse it across components without restructuring the component tree.',
}

const GPT_RESPONSES: Record<string, string> = {
  default:
    "React hooks let functional components use state and lifecycle features. useState manages local state, useEffect handles side effects like fetching data or subscriptions, and useContext accesses shared values without prop drilling. They replaced class components' lifecycle methods with a cleaner, composable API. Custom hooks let you extract and reuse stateful logic across components.",
}

function getResponse(map: Record<string, string>, text: string): string {
  const lower = text.toLowerCase()
  for (const key of Object.keys(map)) {
    if (key !== 'default' && lower.includes(key)) return map[key]
  }
  return map['default']
}

let msgIdCounter = 100

function nextId(): number {
  return ++msgIdCounter
}

function TitleBar({
  label,
  dotColor,
  streaming,
}: {
  label: string
  dotColor: string
  streaming: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: COLORS.titlebar,
        borderBottom: `1px solid ${COLORS.border}`,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 6px ${dotColor}88`,
          flexShrink: 0,
        }}
      />
      <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>
        {label}
      </span>
      {streaming && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: dotColor,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <StreamingDots color={dotColor} />
          streaming
        </span>
      )}
    </div>
  )
}

function StreamingDots({ color }: { color: string }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 3), 400)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
            opacity: frame === i ? 1 : 0.3,
            transition: 'opacity 0.2s',
          }}
        />
      ))}
    </span>
  )
}

function BlinkingCursor() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setVisible(v => !v), 530)
    return () => clearInterval(t)
  }, [])
  return (
    <span
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        background: visible ? COLORS.cursor : 'transparent',
        verticalAlign: 'text-bottom',
        marginLeft: 1,
        borderRadius: 1,
      }}
    />
  )
}

function ChatPanel({
  label,
  dotColor,
  bubbleColor,
  state,
  scrollRef,
}: {
  label: string
  dotColor: string
  bubbleColor: string
  state: PanelState
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
      }}
    >
      <TitleBar label={label} dotColor={dotColor} streaming={state.streaming} />
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          scrollbarWidth: 'thin',
          scrollbarColor: `${COLORS.border} transparent`,
        }}
      >
        {state.messages.length === 0 && (
          <div
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              textAlign: 'center',
              marginTop: 24,
              opacity: 0.7,
            }}
          >
            Waiting for a message…
          </div>
        )}
        {state.messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '88%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user' ? COLORS.userBubble : bubbleColor,
                color: COLORS.textPrimary,
                fontSize: 13,
                lineHeight: 1.55,
                wordBreak: 'break-word',
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {msg.content}
              {msg.streaming && <BlinkingCursor />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function useStreamMessage(
  setState: React.Dispatch<React.SetStateAction<PanelState>>,
  scrollRef: React.RefObject<HTMLDivElement>,
) {
  const activeRef = useRef(false)

  const stream = useCallback(
    (text: string, delayMs: number) => {
      activeRef.current = true
      const id = nextId()

      setState(s => ({
        streaming: true,
        messages: [...s.messages, { id, role: 'assistant', content: '', streaming: true }],
      }))

      let charIndex = 0
      const chunkSize = () => Math.floor(Math.random() * 3) + 1

      function tick() {
        if (!activeRef.current) return
        const chunk = chunkSize()
        charIndex = Math.min(charIndex + chunk, text.length)
        const done = charIndex >= text.length

        setState(s => ({
          streaming: !done,
          messages: s.messages.map(m =>
            m.id === id
              ? { ...m, content: text.slice(0, charIndex), streaming: !done }
              : m,
          ),
        }))

        if (!done) {
          setTimeout(tick, delayMs + Math.random() * delayMs * 0.4)
        } else {
          activeRef.current = false
        }

        requestAnimationFrame(() => {
          if (scrollRef.current) {
            // scroll removed
          }
        })
      }

      setTimeout(tick, 120)
    },
    [setState, scrollRef],
  )

  return stream
}

export function MultiModelChat() {
  const [claudeState, setClaudeState] = useState<PanelState>({ messages: [], streaming: false })
  const [gptState, setGptState] = useState<PanelState>({ messages: [], streaming: false })
  const [input, setInput] = useState('')
  const [demoPlayed, setDemoPlayed] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(true)

  const claudeScrollRef = useRef<HTMLDivElement>(null)
  const gptScrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const streamClaude = useStreamMessage(setClaudeState, claudeScrollRef)
  const streamGpt = useStreamMessage(setGptState, gptScrollRef)

  const sendBoth = useCallback(
    (text: string) => {
      const userMsgClaude: Message = { id: nextId(), role: 'user', content: text }
      const userMsgGpt: Message = { id: nextId(), role: 'user', content: text }

      setClaudeState(s => ({ ...s, messages: [...s.messages, userMsgClaude] }))
      setGptState(s => ({ ...s, messages: [...s.messages, userMsgGpt] }))

      const claudeText = getResponse(CLAUDE_RESPONSES, text)
      const gptText = getResponse(GPT_RESPONSES, text)

      // Claude streams a bit slower (more tokens, more analytical)
      streamClaude(claudeText, 28)
      // GPT streams faster (more concise)
      streamGpt(gptText, 22)
    },
    [streamClaude, streamGpt],
  )

  // Auto-play demo
  useEffect(() => {
    if (demoPlayed) return
    setDemoPlayed(true)

    const demoPrompt = 'Explain React hooks in one paragraph'

    const t = setTimeout(() => {
      sendBoth(demoPrompt)

      // Enable input after demo streaming finishes (give enough time)
      setTimeout(() => {
        setInputDisabled(false)
        requestAnimationFrame(() => inputRef.current?.focus())
      }, 6000)
    }, 1000)

    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || inputDisabled || claudeState.streaming || gptState.streaming) return
    setInput('')
    sendBoth(text)
  }

  const bothStreaming = claudeState.streaming || gptState.streaming

  return (
    <div
      style={{
        background: COLORS.bg,
        borderRadius: 12,
        padding: 16,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Panels */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          height: 360,
        }}
      >
        <ChatPanel
          label="Claude"
          dotColor={COLORS.claudeDot}
          bubbleColor={COLORS.claudeBubble}
          state={claudeState}
          scrollRef={claudeScrollRef}
        />
        <ChatPanel
          label="GPT"
          dotColor={COLORS.gptDot}
          bubbleColor={COLORS.gptBubble}
          state={gptState}
          scrollRef={gptScrollRef}
        />
      </div>

      {/* Shared input bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={inputDisabled || bothStreaming}
          placeholder={
            inputDisabled
              ? 'Demo playing…'
              : bothStreaming
                ? 'Waiting for responses…'
                : 'Ask both models…'
          }
          style={{
            flex: 1,
            background: COLORS.inputBg,
            border: `1px solid ${input.length > 0 ? COLORS.inputFocusBorder : COLORS.inputBorder}`,
            borderRadius: 8,
            padding: '9px 13px',
            color: COLORS.textPrimary,
            fontSize: 13,
            outline: 'none',
            transition: 'border-color 0.15s',
            opacity: inputDisabled || bothStreaming ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={inputDisabled || bothStreaming || !input.trim()}
          style={{
            background:
              !inputDisabled && !bothStreaming && input.trim()
                ? COLORS.buttonActive
                : COLORS.buttonBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.textPrimary,
            padding: '9px 16px',
            fontSize: 13,
            cursor:
              !inputDisabled && !bothStreaming && input.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
            flexShrink: 0,
            fontWeight: 500,
          }}
        >
          Send to both
        </button>
      </form>

      <div
        style={{
          fontSize: 11,
          color: COLORS.textSecondary,
          textAlign: 'center',
          opacity: 0.7,
        }}
      >
        Both panels receive the same message — different adapters, different responses
      </div>
    </div>
  )
}
