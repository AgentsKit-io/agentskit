'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const PLAN_RESPONSE = `## Plan

1. **Research** (→ researcher): Investigate best practices and patterns
2. **Implement** (→ coder): Write the code following identified patterns
3. **Review**: Verify output quality

---

### Step 1: Research (delegated to researcher)
Analyzed 3 relevant sources. Key findings:
- Use modular architecture with clear separation of concerns
- Follow established naming conventions and patterns
- Include comprehensive error handling

### Step 2: Implementation (delegated to coder)
Code written following the research findings:
- Created main module with clean interfaces
- Added input validation and error handling
- Wrote unit tests for critical paths

### Summary
Task completed successfully. The researcher identified best practices and the coder implemented them with full test coverage.`

const FOLLOWUP_RESPONSES = [
  "I'll break this down into manageable steps.\n\n1. **Analysis** (→ researcher): Understanding requirements\n2. **Design** (→ coder): Architecture decisions\n3. **Execution** (→ coder): Implementation\n\nAll steps completed. The team worked efficiently on this task.",
  "Here's my plan for this:\n\n### Research Phase\nThe researcher agent gathered context and identified key constraints.\n\n### Implementation Phase\nThe coder agent built the solution following the research findings.\n\nDelivery complete with all quality checks passed.",
]

let followupIndex = 0

export function MultiAgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: "I'm the **Planner** agent. Give me a complex task and I'll break it down, delegating to **researcher** and **coder** specialists.",
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextIdRef = useRef(1)
  const isFirstResponse = useRef(true)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => { if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const stopStreaming = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setIsStreaming(false)
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m))
  }, [])

  const streamResponse = useCallback((assistantId: number, text: string) => {
    let charIndex = 0
    setIsStreaming(true)
    intervalRef.current = setInterval(() => {
      const chunkSize = Math.floor(Math.random() * 4) + 2
      charIndex = Math.min(charIndex + chunkSize, text.length)
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: text.slice(0, charIndex) } : m))
      if (charIndex >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        setIsStreaming(false)
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m))
        inputRef.current?.focus()
      }
    }, 15)
  }, [])

  const send = useCallback(() => {
    if (!input.trim() || isStreaming) return
    const userId = nextIdRef.current++
    const assistantId = nextIdRef.current++
    setMessages(prev => [...prev, { id: userId, role: 'user', content: input.trim() }, { id: assistantId, role: 'assistant', content: '', streaming: true }])
    setInput('')

    const response = isFirstResponse.current
      ? PLAN_RESPONSE
      : FOLLOWUP_RESPONSES[followupIndex++ % FOLLOWUP_RESPONSES.length]
    isFirstResponse.current = false

    setTimeout(() => streamResponse(assistantId, response), 300)
  }, [input, isStreaming, streamResponse])

  return (
    <div style={{ border: '1px solid var(--color-ak-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-ak-border)', background: 'var(--color-ak-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>🤖</span>
        <strong style={{ fontSize: '0.9rem' }}>Multi-Agent Planner</strong>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-ak-graphite)' }}>planner → researcher + coder</span>
      </div>
      <div ref={containerRef} style={{ height: '400px', overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              background: m.role === 'user' ? 'var(--color-ak-blue)' : 'var(--color-ak-surface)',
              color: m.role === 'user' ? '#fff' : 'inherit',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
              {m.content || (m.streaming ? '●●●' : '')}
            </div>
          </div>
        ))}
        <div ref={containerRef} />
      </div>
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-ak-border)', display: 'flex', gap: '0.5rem' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          placeholder="Give me a complex task to plan..."
          disabled={isStreaming}
          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-ak-border)', fontSize: '0.9rem', outline: 'none' }}
        />
        <button onClick={isStreaming ? stopStreaming : send} disabled={!isStreaming && !input.trim()} style={{
          padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
          background: isStreaming ? '#e74c3c' : 'var(--color-ak-blue)', color: '#fff',
          opacity: !isStreaming && !input.trim() ? 0.5 : 1,
        }}>
          {isStreaming ? 'Stop' : 'Send'}
        </button>
      </div>
    </div>
  )
}