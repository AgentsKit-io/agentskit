import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Shared task state ────────────────────────────────────────────────────────

interface Task {
  id: number
  label: string
  done: boolean
}

const INITIAL_TASKS: Task[] = [
  { id: 1, label: 'Design mockup', done: true },
  { id: 2, label: 'Build API', done: false },
  { id: 3, label: 'Write tests', done: false },
]

const DAILY_ACTIVITY = [3, 7, 5, 9] // bar heights (arbitrary units)

// ─── Task Tracker Widget ──────────────────────────────────────────────────────

function TaskTrackerWidget({
  tasks,
  onToggle,
  onAdd,
}: {
  tasks: Task[]
  onToggle: (id: number) => void
  onAdd: (label: string) => void
}) {
  const [newTask, setNewTask] = useState('')
  const completed = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  const handleAdd = () => {
    const label = newTask.trim()
    if (!label) return
    onAdd(label)
    setNewTask('')
  }

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid rgba(99,102,241,0.35)',
        borderRadius: 10,
        padding: '14px 16px',
        marginTop: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#818cf8',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Task Tracker
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {tasks.map(task => (
          <div
            key={task.id}
            onClick={() => onToggle(task.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 6,
              background: task.done ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
              transition: 'background 0.15s',
              userSelect: 'none',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.background = task.done
                ? 'rgba(99,102,241,0.14)'
                : 'rgba(255,255,255,0.07)')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.background = task.done
                ? 'rgba(99,102,241,0.08)'
                : 'rgba(255,255,255,0.03)')
            }
          >
            {/* Checkbox */}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: task.done ? 'none' : '2px solid #475569',
                background: task.done ? '#6366f1' : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {task.done && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: 13,
                color: task.done ? '#475569' : '#cbd5e1',
                textDecoration: task.done ? 'line-through' : 'none',
                transition: 'color 0.15s, text-decoration 0.15s',
              }}
            >
              {task.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#475569',
            marginBottom: 4,
          }}
        >
          <span>Progress</span>
          <span style={{ color: '#818cf8', fontWeight: 600 }}>
            {completed}/{total} complete
          </span>
        </div>
        <div
          style={{
            height: 5,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Add task */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Add a task..."
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '6px 10px',
            color: '#e2e8f0',
            fontSize: 12,
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={handleAdd}
          disabled={!newTask.trim()}
          style={{
            background: newTask.trim() ? '#6366f1' : '#1e293b',
            color: newTask.trim() ? '#fff' : '#475569',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: newTask.trim() ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Dashboard Widget ─────────────────────────────────────────────────────────

function DashboardWidget({ tasks }: { tasks: Task[] }) {
  const completed = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  const metrics = [
    { label: 'Tasks', value: `${completed}/${total}`, color: '#6366f1' },
    { label: 'Completion', value: `${pct}%`, color: '#22d3ee' },
    { label: 'Streak', value: '3 days', color: '#34d399' },
  ]

  const maxBar = Math.max(...DAILY_ACTIVITY)

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid rgba(34,211,238,0.3)',
        borderRadius: 10,
        padding: '14px 16px',
        marginTop: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#22d3ee',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Progress Dashboard
      </div>

      {/* Metric cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {metrics.map(m => (
          <div
            key={m.label}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid rgba(255,255,255,0.07)`,
              borderRadius: 8,
              padding: '10px 8px',
              textAlign: 'center',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: m.color,
                lineHeight: 1.2,
                transition: 'color 0.3s',
              }}
            >
              {m.value}
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 500 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div>
        <div style={{ fontSize: 10, color: '#475569', fontWeight: 500, marginBottom: 6 }}>
          Daily Activity
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            height: 48,
          }}
        >
          {DAILY_ACTIVITY.map((val, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${(val / maxBar) * 100}%`,
                  background:
                    i === DAILY_ACTIVITY.length - 1
                      ? 'linear-gradient(180deg, #22d3ee, #0891b2)'
                      : 'rgba(34,211,238,0.25)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {['Mon', 'Tue', 'Wed', 'Thu'].map(day => (
            <div
              key={day}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 9,
                color: '#334155',
                fontWeight: 500,
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Message types ─────────────────────────────────────────────────────────────

type WidgetType = 'task-tracker' | 'dashboard'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  widget?: WidgetType
}

// ─── Demo script ───────────────────────────────────────────────────────────────

const DEMO_STEPS: Array<{
  delay: number
  role: 'user' | 'assistant'
  text: string
  streamDelay?: number
  widget?: WidgetType
}> = [
  {
    delay: 900,
    role: 'user',
    text: 'Create a task tracker',
  },
  {
    delay: 600,
    role: 'assistant',
    text: "Here's your task tracker:",
    streamDelay: 28,
    widget: 'task-tracker',
  },
  {
    delay: 3200,
    role: 'user',
    text: 'Add a progress dashboard',
  },
  {
    delay: 600,
    role: 'assistant',
    text: 'Added a dashboard with live metrics:',
    streamDelay: 28,
    widget: 'dashboard',
  },
]

// ─── Main component ────────────────────────────────────────────────────────────

export function AgentActions() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [demoComplete, setDemoComplete] = useState(false)

  const nextIdRef = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const addId = () => {
    const id = nextIdRef.current
    nextIdRef.current += 1
    return id
  }

  const streamText = useCallback(
    (msgId: number, text: string, speed: number, onDone?: () => void) => {
      let i = 0
      setIsStreaming(true)

      intervalRef.current = setInterval(() => {
        i++
        const chunk = text.slice(0, i)
        const done = i >= text.length

        setMessages(prev =>
          prev.map(m =>
            m.id === msgId ? { ...m, content: chunk, streaming: !done } : m
          )
        )

        if (done) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setIsStreaming(false)
          onDone?.()
        }
      }, speed)
    },
    []
  )

  // Run demo
  useEffect(() => {
    let cumulativeDelay = 0

    DEMO_STEPS.forEach((step, stepIndex) => {
      cumulativeDelay += step.delay

      const t1 = setTimeout(() => {
        const msgId = addId()

        if (step.role === 'user') {
          setMessages(prev => [...prev, { id: msgId, role: 'user', content: step.text }])
        } else {
          // Add streaming assistant message (no widget yet)
          setMessages(prev => [
            ...prev,
            { id: msgId, role: 'assistant', content: '', streaming: true },
          ])

          const speed = step.streamDelay ?? 24
          streamText(msgId, step.text, speed, () => {
            // After streaming text, attach widget
            if (step.widget) {
              setMessages(prev =>
                prev.map(m => (m.id === msgId ? { ...m, widget: step.widget } : m))
              )
            }
            if (stepIndex === DEMO_STEPS.length - 1) {
              setDemoComplete(true)
            }
          })
        }
      }, cumulativeDelay)

      timeoutsRef.current.push(t1)
    })

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = useCallback((id: number) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])

  const handleAddTask = useCallback((label: string) => {
    setTasks(prev => [
      ...prev,
      { id: Date.now(), label, done: false },
    ])
  }, [])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return

    const userId = addId()
    const assistantId = addId()

    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])
    setInput('')

    const reply = "I've updated the interface based on your request. You can keep interacting with the widgets above!"
    const t = setTimeout(() => streamText(assistantId, reply, 22), 500)
    timeoutsRef.current.push(t)
  }, [input, isStreaming, streamText])

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
  useEffect(
    () => () => {
      timeoutsRef.current.forEach(clearTimeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    },
    []
  )

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
        height: 580,
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
          AI Agent
        </div>
        {isStreaming && (
          <div
            style={{
              fontSize: 11,
              color: '#818cf8',
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              animation: 'aaAgentPulse 1.4s ease-in-out infinite',
            }}
          >
            Generating...
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
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#334155',
              fontSize: 13,
              marginTop: 40,
              fontStyle: 'italic',
            }}
          >
            Demo starting...
          </div>
        )}
        {messages.map(msg => (
          <AgentMessageBubble
            key={msg.id}
            message={msg}
            tasks={tasks}
            onToggle={handleToggle}
            onAdd={handleAddTask}
          />
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
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !demoComplete
              ? 'Demo in progress...'
              : isStreaming
              ? 'Waiting for response...'
              : 'Ask the agent to build something...'
          }
          disabled={!demoComplete || isStreaming}
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
            opacity: !demoComplete || isStreaming ? 0.4 : 1,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={sendMessage}
          disabled={!demoComplete || !input.trim() || isStreaming}
          style={{
            background: demoComplete && input.trim() && !isStreaming ? '#6366f1' : '#1e293b',
            color: demoComplete && input.trim() && !isStreaming ? '#fff' : '#475569',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: demoComplete && input.trim() && !isStreaming ? 'pointer' : 'default',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (demoComplete && input.trim() && !isStreaming)
              e.currentTarget.style.background = '#4f46e5'
          }}
          onMouseLeave={e => {
            if (demoComplete && input.trim() && !isStreaming)
              e.currentTarget.style.background = '#6366f1'
          }}
        >
          Send
        </button>
      </div>

      <style>{`
        @keyframes aaAgentBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes aaAgentPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ─── Message bubble with optional widget ─────────────────────────────────────

function AgentMessageBubble({
  message,
  tasks,
  onToggle,
  onAdd,
}: {
  message: ChatMessage
  tasks: Task[]
  onToggle: (id: number) => void
  onAdd: (label: string) => void
}) {
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
        {isUser ? 'You' : 'AI Agent'}
      </div>
      <div style={{ maxWidth: isUser ? '70%' : '92%', width: isUser ? undefined : '92%' }}>
        {/* Text bubble */}
        {(message.content.length > 0 || message.streaming) && (
          <div
            style={{
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
            {message.streaming && message.content.length > 0 && (
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: '1em',
                  background: '#818cf8',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  animation: 'aaAgentBlink 0.8s step-end infinite',
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
        )}

        {/* Inline widget */}
        {message.widget === 'task-tracker' && (
          <TaskTrackerWidget tasks={tasks} onToggle={onToggle} onAdd={onAdd} />
        )}
        {message.widget === 'dashboard' && <DashboardWidget tasks={tasks} />}
      </div>
    </div>
  )
}
