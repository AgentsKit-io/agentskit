'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { decodeEvents, type UiEvent } from '@/lib/ask/protocol'

/**
 * Where to POST the chat. Defaults to the same-origin Vercel route; set
 * `NEXT_PUBLIC_ASK_ENDPOINT` (e.g. `https://ask.agentskit.io/v1/ask?corpus=docs`)
 * to route to the central persistent backend (RFC-0007). Both speak the same
 * NDJSON `UiEvent` protocol, so nothing else changes.
 */
const ASK_ENDPOINT = process.env.NEXT_PUBLIC_ASK_ENDPOINT || '/api/ask-docs'

/**
 * A rendered part of an assistant turn. Parts are kept in arrival order so the
 * widget can interleave streamed prose (`text`) with generative-UI tool calls
 * (`tool`) exactly as the model emitted them.
 */
export type AssistantPart =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; id: string; name: string; args: Record<string, unknown> }

/** A user turn — plain text. */
export interface UserMessage {
  id: string
  role: 'user'
  text: string
}

/** An assistant turn — an ordered list of text/tool parts. */
export interface AssistantMessage {
  id: string
  role: 'assistant'
  parts: AssistantPart[]
  /** True while this turn is still receiving events. */
  streaming: boolean
}

export type ChatMessage = UserMessage | AssistantMessage

const STORAGE_KEY = 'ak:ask-thread-v2'
const MAX_PERSISTED = 20

export interface UseAskChatOptions {
  /**
   * Chat endpoint. May be relative (`/api/ask-docs`) or absolute
   * (`https://ask.agentskit.io/v1/ask?corpus=docs`).
   */
  endpoint?: string
  /** Corpus routed by the central ask backend, e.g. `docs`, `registry`, `playbook`, `akos`. */
  corpus?: string
  /** Optional persona override routed by the central ask backend. */
  persona?: string
  /** Session storage key. Defaults to a corpus/persona-scoped key. */
  storageKey?: string
}

function newId(): string {
  // crypto.randomUUID is available in modern browsers + edge; fall back for SSR.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function scopedStorageKey(corpus?: string, persona?: string): string {
  const scope = [corpus, persona].filter(Boolean).join(':')
  return scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY
}

function withAskParams(endpoint: string, options: Pick<UseAskChatOptions, 'corpus' | 'persona'>): string {
  const params = Object.entries({ corpus: options.corpus, persona: options.persona }).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== '',
  )
  if (params.length === 0) return endpoint

  try {
    const isRelative = endpoint.startsWith('/')
    const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const url = new URL(endpoint, base)
    for (const [key, value] of params) url.searchParams.set(key, value)
    return isRelative ? `${url.pathname}${url.search}${url.hash}` : url.toString()
  } catch {
    const glue = endpoint.includes('?') ? '&' : '?'
    return `${endpoint}${glue}${params
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')}`
  }
}

function readThread(storageKey: string): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeThread(storageKey: string, thread: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(thread.slice(-MAX_PERSISTED)))
  } catch {
    /* quota / disabled storage — ignore */
  }
}

/**
 * Flatten the timeline into the `{ role, content }[]` shape the `/api/ask-docs`
 * route expects. Assistant tool parts are summarised as text so the model has
 * conversational continuity without re-emitting raw tool JSON.
 */
function toWireMessages(thread: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return thread.map((m) => {
    if (m.role === 'user') return { role: 'user', content: m.text }
    const content = m.parts
      .map((p) => (p.kind === 'text' ? p.text : `[${p.name}]`))
      .join('\n')
      .trim()
    return { role: 'assistant', content }
  })
}

export interface UseAskChat {
  messages: ChatMessage[]
  streaming: boolean
  error: string | null
  /** Send `text` as a new user turn and stream the assistant reply. */
  send: (text: string) => Promise<void>
  /** Abort the in-flight stream (if any). */
  stop: () => void
  /** Clear the whole timeline + persistence + error. */
  clear: () => void
  /**
   * Append a client-originated tool part as a fresh assistant turn. Used to
   * surface in-browser actions (e.g. a `runExample` result from clicking Run on
   * a code block) inline in the timeline without a server round-trip.
   */
  appendLocalTool: (name: string, args: Record<string, unknown>) => void
}

/**
 * Headless chat engine for the Ask-the-docs widget.
 *
 * Holds the message timeline, POSTs `{ messages }` to `/api/ask-docs`, and
 * consumes the NDJSON `UiEvent` stream via `decodeEvents`: `text` deltas append
 * to (or open) a trailing text part; `tool` events append a tool part; `done`
 * closes the turn; `error` surfaces a message. The route may also stream plain
 * text (no events) — in that case the raw decoded text is appended as a text
 * part, so the hook degrades gracefully to a prose-only backend.
 *
 * Persists to `sessionStorage` (last 20 turns), matching the prior widget.
 */
export function useAskChat(options: UseAskChatOptions = {}): UseAskChat {
  const askEndpoint = useMemo(
    () => withAskParams(options.endpoint ?? ASK_ENDPOINT, options),
    [options.endpoint, options.corpus, options.persona],
  )
  const storageKey = useMemo(
    () => options.storageKey ?? scopedStorageKey(options.corpus, options.persona),
    [options.storageKey, options.corpus, options.persona],
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Mirror of `messages` for building the wire payload without a stale closure.
  const messagesRef = useRef<ChatMessage[]>([])

  useEffect(() => {
    const initial = readThread(storageKey)
    setMessages(initial)
    messagesRef.current = initial
  }, [storageKey])

  useEffect(() => {
    messagesRef.current = messages
    writeThread(storageKey, messages)
  }, [messages, storageKey])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    messagesRef.current = []
    setError(null)
    writeThread(storageKey, [])
  }, [storageKey])

  /** Append an event to the trailing assistant turn (id `assistantId`). */
  const applyEvent = useCallback((assistantId: string, ev: UiEvent) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId || m.role !== 'assistant') return m
        if (ev.type === 'text') {
          const parts = m.parts.slice()
          const last = parts[parts.length - 1]
          if (last && last.kind === 'text') {
            parts[parts.length - 1] = { kind: 'text', text: last.text + ev.delta }
          } else {
            parts.push({ kind: 'text', text: ev.delta })
          }
          return { ...m, parts }
        }
        if (ev.type === 'tool') {
          return {
            ...m,
            parts: [...m.parts, { kind: 'tool', id: ev.id, name: ev.name, args: ev.args }],
          }
        }
        return m
      }),
    )
  }, [])

  /** Replace the assistant turn with a single text part (plain-text backend). */
  const setAssistantText = useCallback((assistantId: string, text: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? { ...m, parts: [{ kind: 'text', text }] }
          : m,
      ),
    )
  }, [])

  const closeTurn = useCallback((assistantId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant' ? { ...m, streaming: false } : m,
      ),
    )
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || streaming) return

      const userMsg: UserMessage = { id: newId(), role: 'user', text: trimmed }
      const assistantId = newId()
      const assistantMsg: AssistantMessage = {
        id: assistantId,
        role: 'assistant',
        parts: [],
        streaming: true,
      }

      const base = messagesRef.current
      const next = [...base, userMsg]
      messagesRef.current = [...next, assistantMsg]
      setMessages([...next, assistantMsg])
      setError(null)
      setStreaming(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const res = await fetch(askEndpoint, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages: toWireMessages(next) }),
        })

        if (!res.ok || !res.body) {
          const body = (await res
            .json()
            .catch(() => ({ error: `${res.status} ${res.statusText}` }))) as { error?: string }
          throw new Error(body.error || `${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        // Decided on the first non-empty chunk: NDJSON `UiEvent` stream (the
        // generative-UI contract) vs. a legacy plain-text stream. The plain
        // path replaces a single text part each tick so the hook degrades
        // gracefully to a prose-only backend.
        let mode: 'unknown' | 'ndjson' | 'text' = 'unknown'

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          if (mode === 'unknown') {
            const head = buffer.trimStart()
            if (head === '') continue
            mode = head.startsWith('{') ? 'ndjson' : 'text'
          }

          if (mode === 'ndjson') {
            const { events, rest } = decodeEvents(buffer)
            buffer = rest
            for (const ev of events) {
              if (ev.type === 'error') setError(ev.message)
              else applyEvent(assistantId, ev)
            }
          } else {
            setAssistantText(assistantId, buffer)
          }
        }

        // Flush any trailing partial NDJSON line.
        if (mode === 'ndjson') {
          const tail = buffer.trim()
          if (tail) {
            const { events } = decodeEvents(tail + '\n')
            for (const ev of events) {
              if (ev.type === 'error') setError(ev.message)
              else applyEvent(assistantId, ev)
            }
          }
        }
      } catch (e) {
        if (!ctrl.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        closeTurn(assistantId)
        setStreaming(false)
        abortRef.current = null
      }
    },
    [applyEvent, askEndpoint, closeTurn, setAssistantText, streaming],
  )

  const appendLocalTool = useCallback(
    (name: string, args: Record<string, unknown>) => {
      const msg: AssistantMessage = {
        id: newId(),
        role: 'assistant',
        parts: [{ kind: 'tool', id: newId(), name, args }],
        streaming: false,
      }
      setMessages((prev) => [...prev, msg])
    },
    [],
  )

  return { messages, streaming, error, send, stop, clear, appendLocalTool }
}
