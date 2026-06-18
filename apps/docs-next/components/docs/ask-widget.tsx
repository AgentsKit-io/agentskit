'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { AnimatedLogo } from '@/components/brand/animated-logo'
import { Markdown } from './ask/Markdown'
import { defaultRegistry } from './ask/registry'
import type { UiToolContext, UiToolRegistry } from './ask/registry'
import {
  useAskChat,
  type AssistantMessage,
  type AssistantPart,
  type ChatMessage,
} from './ask/useAskChat'

/**
 * Customization surface passed to render-prop slots. Consumers can override how
 * a whole message renders, or just how a single tool part renders, while
 * reusing the default for everything else.
 */
export interface AskRenderContext {
  registry: UiToolRegistry
  ctx: UiToolContext
}

export interface AskDocsWidgetProps {
  /** Override the floating-button label / open trigger content. */
  fabLabel?: ReactNode
  /** Override the header title. */
  title?: ReactNode
  /** Empty-state copy shown before the first turn. */
  emptyState?: ReactNode
  /**
   * Override rendering of a whole assistant/user message. Return `undefined` to
   * fall back to the default renderer.
   */
  renderMessage?: (message: ChatMessage, render: AskRenderContext) => ReactNode | undefined
  /**
   * Override rendering of a single tool part. Return `undefined` to fall back to
   * the registry's allow-listed renderer.
   */
  renderTool?: (
    part: Extract<AssistantPart, { kind: 'tool' }>,
    render: AskRenderContext,
  ) => ReactNode | undefined
  /** Swap in a custom (still allow-list-guarded) registry. */
  registry?: UiToolRegistry
  /** Logo shown beside the header title. Slot — defaults to the AgentsKit mark. */
  logo?: ReactNode
  /** Loading state shown while the assistant prepares its first chunk. Slot. */
  loadingState?: ReactNode
  /**
   * Docs page that explains how to build this exact chat. Rendered as a link
   * under the composer. Defaults to the AgentsKit "Ask the docs" recipe.
   */
  docsHref?: string
  /** Open by default. Defaults to true (the chat is the flagship example). */
  defaultOpen?: boolean
}

/**
 * Ask-the-docs chat — a compound, template-owned shell composing `useAskChat`
 * (timeline + streaming) with the generative-UI registry (allow-listed render
 * boundary). It renders each assistant turn as an ordered list of parts: `text`
 * parts go through the shared `Markdown` renderer; `tool` parts are resolved by
 * name through `registry.render`, which renders nothing for any name not in
 * `UI_TOOL_NAMES`.
 *
 * Interaction wiring:
 *   - `onSelect(value)` (from `Options`) sends `value` as a new user turn.
 *   - `onSubmit(action, values)` (from `Form`) sends a serialized turn so the
 *     model can react to the collected inputs.
 *   - `onRun(code)` (from a runnable `CodeBlock`) appends a local `runExample`
 *     tool part; `RunResult` then executes it in-browser via the zero-vendor
 *     `webWorkerBackend` / `runStreaming` from `@agentskit/sandbox/web`.
 *
 * Headless + `data-ak-*` + `--ak-*` tokens only; no hardcoded colors. Lives in
 * the template (does NOT modify `@agentskit/react`).
 */
export function AskDocsWidget({
  fabLabel,
  title,
  emptyState,
  renderMessage,
  renderTool,
  registry = defaultRegistry,
  logo,
  loadingState,
  docsHref = '/docs/cookbook/ask-the-docs',
  defaultOpen = true,
}: AskDocsWidgetProps = {}) {
  const [open, setOpen] = useState(defaultOpen)
  const [input, setInput] = useState('')
  const { messages, streaming, error, send, stop, clear, appendLocalTool } = useAskChat()
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onSelect = useCallback((value: string) => void send(value), [send])

  const onSubmit = useCallback(
    (action: string, values: Record<string, string>) => {
      const summary = Object.entries(values)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
      void send(`${action}(${summary})`)
    },
    [send],
  )

  const onRun = useCallback(
    (code: string) => appendLocalTool('runExample', { code }),
    [appendLocalTool],
  )

  const ctx: UiToolContext = { onSelect, onSubmit, onRun }
  const renderCtx: AskRenderContext = { registry, ctx }

  const submit = useCallback(() => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    void send(text)
  }, [input, send, streaming])

  const renderPart = (part: AssistantPart, key: string): ReactNode => {
    if (part.kind === 'text') {
      if (!part.text) return null
      return <Markdown key={key} content={part.text} streaming={streaming} />
    }
    const override = renderTool?.(part, renderCtx)
    if (override !== undefined) return <div key={key}>{override}</div>
    return <div key={key}>{registry.render(part.name, part.args, { ...ctx, id: part.id })}</div>
  }

  const renderMsg = (m: ChatMessage): ReactNode => {
    const override = renderMessage?.(m, renderCtx)
    if (override !== undefined) return override

    if (m.role === 'user') {
      return (
        <div
          data-ak-message="user"
          className="max-w-[85%] self-end rounded-lg rounded-br-sm bg-ak-blue/10 px-3 py-2 text-sm text-ak-foam"
        >
          {m.text}
        </div>
      )
    }

    const assistant = m as AssistantMessage
    const isEmpty = assistant.parts.length === 0
    return (
      <div
        data-ak-message="assistant"
        data-ak-streaming={assistant.streaming ? 'true' : undefined}
        className="flex max-w-[92%] flex-col gap-1.5 self-start"
      >
        {isEmpty && assistant.streaming ? (
          loadingState ?? (
            <div
              data-ak-ask-loading
              className="flex items-center gap-2.5 px-1 py-2 text-ak-blue"
              aria-label="Searching the docs"
            >
              {/* The animated AgentsKit mark (dots circling the triangle). Swap
                  via the `loadingState` slot. */}
              <AnimatedLogo variant="nav" loop size={24} />
              <span className="font-mono text-[11px] uppercase tracking-wide text-ak-graphite">
                Searching the docs…
              </span>
            </div>
          )
        ) : (
          assistant.parts.map((part, i) => renderPart(part, `${assistant.id}-${i}`))
        )}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask the docs"
        data-ak-ask-fab=""
        className="group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ak-border bg-ak-midnight px-4 py-2.5 font-mono text-xs font-semibold text-ak-foam shadow-lg transition-all hover:border-ak-blue hover:shadow-ak-blue/20"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-ak-green transition-transform group-hover:scale-125"
        />
        {fabLabel ?? 'Ask the docs'}
      </button>
    )
  }

  return (
    <div
      data-ak-ask-panel=""
      className="fixed bottom-4 right-4 z-50 flex h-[min(620px,82vh)] w-[min(440px,94vw)] flex-col overflow-hidden rounded-xl border border-ak-border bg-ak-midnight shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-ak-border bg-gradient-to-br from-ak-surface to-ak-midnight px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* Logo slot — defaults to the AgentsKit mark; swap via `logo`. */}
          <span aria-hidden className="text-ak-foam" data-ak-ask-logo="">
            {logo ?? <AnimatedLogo variant="nav" size={18} />}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-ak-graphite">
            {title ?? 'Ask the docs'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clear}
            className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite transition-colors hover:text-ak-foam"
          >
            clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-ak-graphite transition-colors hover:text-ak-foam"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="mb-3 text-sm text-ak-graphite" data-ak-empty="">
            {emptyState ?? (
              <>
                Ask anything about AgentsKit. Answers come from the docs corpus via
                OpenRouter free-tier models. Rate limited per IP.
              </>
            )}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col">
              {renderMsg(m)}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {error ? (
          <p
            data-ak-error=""
            className="mt-3 rounded-md border border-ak-red/40 bg-ak-red/5 p-2 text-xs text-ak-red"
          >
            {error}
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
                submit()
              }
            }}
            rows={2}
            placeholder="Ask a question…"
            data-ak-composer=""
            className="flex-1 resize-none rounded-md border border-ak-border bg-ak-surface p-2 font-mono text-xs text-ak-foam outline-none transition-colors focus:border-ak-blue"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              data-ak-stop=""
              className="rounded-md border border-ak-red/40 bg-ak-red/10 px-3 font-mono text-xs text-ak-red transition-colors hover:bg-ak-red/20"
            >
              stop
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim()}
              data-ak-send=""
              className="rounded-md bg-ak-foam px-3 font-mono text-xs font-semibold text-ak-midnight transition-colors hover:bg-ak-blue disabled:opacity-40"
            >
              send
            </button>
          )}
        </div>
        {docsHref ? (
          <Link
            href={docsHref}
            data-ak-ask-docs-link=""
            className="mt-2 flex items-center gap-1.5 px-1 font-mono text-[10px] text-ak-graphite transition-colors hover:text-ak-blue"
          >
            <AnimatedLogo variant="nav" size={12} />
            Build a chat like this — step by step →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
