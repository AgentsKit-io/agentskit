'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'ak:ask-thread'

function readThread(): Msg[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Msg[]) : []
  } catch {
    return []
  }
}
function writeThread(t: Msg[]) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t.slice(-20)))
  } catch {
    /* ignore */
  }
}

export function AskDocsWidget() {
  const [open, setOpen] = useState(false)
  const [thread, setThread] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setThread(readThread())
  }, [])

  useEffect(() => {
    writeThread(thread)
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return
    const next: Msg[] = [...thread, { role: 'user', content: input.trim() }]
    setThread([...next, { role: 'assistant', content: '' }])
    setInput('')
    setErr(null)
    setStreaming(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch('/api/ask-docs', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: `${res.status} ${res.statusText}` }))
        throw new Error(body.error || `${res.status}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setThread([...next, { role: 'assistant', content: acc }])
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        const msg = e instanceof Error ? e.message : String(e)
        setErr(msg)
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, thread])

  const clear = () => {
    setThread([])
    setErr(null)
    writeThread([])
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask the docs"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ak-border bg-ak-midnight px-4 py-2 font-mono text-xs font-semibold text-ak-foam shadow-lg transition hover:border-ak-foam"
        >
          <span aria-hidden>💬</span>
          Ask the docs
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(560px,80vh)] w-[min(420px,92vw)] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-midnight shadow-2xl">
          <header className="flex items-center justify-between border-b border-ak-border bg-ak-surface px-4 py-2">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">
              Ask the docs
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:text-ak-foam"
              >
                clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-ak-graphite hover:text-ak-foam"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-3">
            {thread.length === 0 ? (
              <p className="mb-3 text-sm text-ak-graphite">
                Ask anything about AgentsKit. Answers come from the docs corpus via OpenRouter free-tier models (with fallback). Rate limited per IP.
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'self-end bg-ak-foam/10 text-white'
                      : 'self-start bg-ak-surface text-ak-foam'
                  }`}
                >
                  {m.content || <span className="text-ak-graphite">…</span>}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {err ? (
              <p className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">
                {err}
              </p>
            ) : null}
          </div>

          <div className="border-t border-ak-border p-2">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={2}
                placeholder="Ask a question…"
                className="flex-1 resize-none rounded border border-ak-border bg-ak-surface p-2 font-mono text-xs text-ak-foam"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="rounded bg-red-500/20 px-3 font-mono text-xs text-red-300 hover:bg-red-500/30"
                >
                  stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim()}
                  className="rounded bg-ak-foam px-3 font-mono text-xs font-semibold text-ak-midnight hover:bg-white disabled:opacity-50"
                >
                  send
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
