'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'ak:openrouter-key'
const MODEL_KEY = 'ak:openrouter-model'

const DEFAULT_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
]

type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

function readKey() {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}
function writeKey(v: string) {
  if (typeof window === 'undefined') return
  try {
    if (v) window.sessionStorage.setItem(STORAGE_KEY, v)
    else window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
function readModel() {
  if (typeof window === 'undefined') return DEFAULT_MODELS[0]
  return window.localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODELS[0]
}
function writeModel(v: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MODEL_KEY, v)
}

export type LiveAdapterProps = {
  /** Optional system prompt prepended to every request. */
  system?: string
  /** Default user prompt shown in the input. */
  defaultPrompt?: string
  /** Model list override. Defaults to OpenRouter `:free` models. */
  models?: string[]
  /** Optional title displayed in the header. */
  title?: string
}

export function LiveAdapter({
  system,
  defaultPrompt = 'What is AgentsKit in one sentence?',
  models = DEFAULT_MODELS,
  title = 'Live chat — bring your own key',
}: LiveAdapterProps) {
  const [key, setKey] = useState('')
  const [model, setModel] = useState(DEFAULT_MODELS[0])
  const [input, setInput] = useState(defaultPrompt)
  const [messages, setMessages] = useState<Msg[]>([])
  const [streaming, setStreaming] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setKey(readKey())
    setModel(readModel())
  }, [])

  const onKeyChange = (v: string) => {
    setKey(v)
    writeKey(v)
  }
  const onModelChange = (v: string) => {
    setModel(v)
    writeModel(v)
  }

  const send = useCallback(async () => {
    if (!key || !input.trim() || streaming) return
    setErr(null)
    const payload: Msg[] = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...messages,
      { role: 'user' as const, content: input },
    ]
    const next: Msg[] = [...messages, { role: 'user', content: input }]
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://agentskit.io',
          'X-Title': 'AgentsKit docs',
        },
        body: JSON.stringify({ model, stream: true, messages: payload }),
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let acc = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              acc += delta
              setMessages([...next, { role: 'assistant', content: acc }])
            }
          } catch {
            /* ignore partial frames */
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!ctrl.signal.aborted) setErr(msg)
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [key, input, messages, streaming, system, model])

  const stop = () => abortRef.current?.abort()
  const clear = () => {
    setMessages([])
    setErr(null)
  }

  return (
    <div data-ak-live-adapter className="my-6 overflow-hidden rounded-lg border border-ak-border bg-ak-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ak-border px-4 py-2">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">{title}</div>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="rounded border border-ak-border bg-ak-midnight px-2 py-1 font-mono text-xs text-ak-foam"
          aria-label="Model"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </header>

      <div className="p-4">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          OpenRouter API key (stored only for this tab)
        </label>
        <div className="mb-3 flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="sk-or-v1-…"
            autoComplete="off"
            className="flex-1 rounded border border-ak-border bg-ak-midnight px-3 py-2 font-mono text-xs text-ak-foam placeholder:text-ak-graphite"
          />
          {key ? (
            <button
              type="button"
              onClick={() => onKeyChange('')}
              className="rounded border border-ak-border px-3 font-mono text-xs text-ak-graphite hover:text-ak-foam"
            >
              clear
            </button>
          ) : null}
        </div>
        <p className="mb-3 text-xs text-ak-graphite">
          Grab a free key at{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-ak-foam underline">
            openrouter.ai/keys
          </a>
          . The key never leaves this browser session — cleared when you close the tab.
        </p>

        {messages.length > 0 ? (
          <div className="mb-3 flex flex-col gap-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-md px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'self-end bg-ak-foam/10 text-white'
                    : 'self-start bg-ak-midnight text-ak-foam'
                }`}
              >
                {m.content || <span className="text-ak-graphite">…</span>}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder={key ? 'Ask something… (⌘/Ctrl+Enter to send)' : 'Paste an OpenRouter key first ↑'}
            disabled={!key}
            className="flex-1 resize-y rounded border border-ak-border bg-ak-midnight p-2 font-mono text-xs text-ak-foam disabled:opacity-50"
          />
          <div className="flex flex-col gap-2">
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="rounded bg-red-500/20 px-3 py-1 font-mono text-xs text-red-300 hover:bg-red-500/30"
              >
                stop
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={!key || !input.trim()}
                className="rounded bg-ak-foam px-3 py-1 font-mono text-xs font-semibold text-ak-midnight hover:bg-white disabled:opacity-50"
              >
                send
              </button>
            )}
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="rounded border border-ak-border px-3 py-1 font-mono text-xs text-ak-graphite hover:text-ak-foam"
              >
                clear
              </button>
            ) : null}
          </div>
        </div>

        {err ? (
          <p className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">{err}</p>
        ) : null}
      </div>
    </div>
  )
}
