'use client'

import { useState, useId, type ReactNode } from 'react'
import Link from 'next/link'

/**
 * Inline glossary entries used by `<G>`. Keep terms lowercase keys —
 * `<G term="ADAPTER">…</G>` looks them up case-insensitively.
 */
export const GLOSSARY: Record<string, { definition: string; href?: string }> = {
  adapter: {
    definition: 'A function that talks to one LLM provider. Implements the AdapterFactory contract from @agentskit/core (ADR 0001).',
    href: '/docs/get-started/concepts/adapter',
  },
  tool: {
    definition: 'A typed function the agent can call mid-conversation. Defined with `defineTool` or `defineZodTool` and registered on a runtime / useChat.',
    href: '/docs/get-started/concepts/tool',
  },
  skill: {
    definition: 'A packaged persona — system prompt + few-shot examples + suggested tools / delegates. Pure data, no execution logic.',
    href: '/docs/get-started/concepts/skill',
  },
  memory: {
    definition: 'Conversation state that persists between requests (chat memory) or vector embeddings used for retrieval (vector memory).',
    href: '/docs/get-started/concepts/memory',
  },
  retriever: {
    definition: 'A function that returns ranked documents for a query. Typically powered by an embedding model + a vector store; sometimes BM25 or a hybrid.',
    href: '/docs/get-started/concepts/retriever',
  },
  runtime: {
    definition: 'The headless agent loop — drives ReAct, tool calls, delegation, and error handling. UI-agnostic.',
    href: '/docs/get-started/concepts/runtime',
  },
  rag: {
    definition: 'Retrieval-Augmented Generation. Retrieve documents → inject into context → generate. AgentsKit ships `@agentskit/rag` for the orchestration.',
    href: '/docs/data/rag/create-rag',
  },
  controller: {
    definition: 'The chat state machine in @agentskit/core. Frameworks bind to it (useChat in React, useChat composable in Vue, etc.); the controller does not know about the framework.',
    href: '/docs/get-started/concepts/mental-model',
  },
  observer: {
    definition: 'A function that receives every AgentEvent — `chat.start`, `llm:start`, `tool:call`, etc. Loggers, tracers, and cost guards are observers.',
    href: '/docs/production/observability',
  },
  span: {
    definition: 'A timed observation in a trace — has a start time, end time, status, and an attribute bag. Built by createTraceTracker.',
    href: '/docs/production/observability/trace-viewer',
  },
  manifest: {
    definition: 'A YAML/JSON descriptor for a tool, skill, or adapter — ships next to the code so registries can introspect and validate.',
    href: '/docs/api/core',
  },
  agent: {
    definition: 'An LLM + a loop + tools, optionally with memory. In AgentsKit, the runtime turns those into one autonomous task that returns a result.',
    href: '/docs/get-started/concepts',
  },
}

export interface GProps {
  /** Glossary key (case-insensitive). Falls back to children if not found. */
  term: string
  children?: ReactNode
}

/**
 * `<G term="adapter">adapter</G>` — inline glossary lookup with hover/focus
 * popover. Backed by the `GLOSSARY` map above. Adding a term is a one-line
 * registry edit; consumers reference it by key.
 *
 * Renders as a normal underlined link. The popover shows the definition
 * + a "Read more" link to the canonical concept page.
 */
export function G({ term, children }: GProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const entry = GLOSSARY[term.toLowerCase()]

  if (!entry) {
    return <>{children ?? term}</>
  }

  const close = () => setOpen(false)

  return (
    <span
      data-ak-glossary
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={close}
    >
      <button
        type="button"
        aria-describedby={open ? popoverId : undefined}
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'help',
          color: 'inherit',
          font: 'inherit',
          textDecoration: 'underline dotted',
          textUnderlineOffset: 2,
        }}
      >
        {children ?? term}
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          data-ak-glossary-popover
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 6px)',
            left: 0,
            width: 320,
            maxWidth: '90vw',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid var(--color-ak-border, #2a2a2a)',
            background: 'var(--color-ak-surface, #111)',
            color: 'var(--color-ak-foam, #f5f5f5)',
            fontSize: 13,
            lineHeight: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ marginBottom: 6 }}>{entry.definition}</div>
          {entry.href && (
            <Link href={entry.href} style={{ fontSize: 12, color: 'var(--color-ak-blue, #4ea1ff)' }}>
              Read more →
            </Link>
          )}
        </span>
      )}
    </span>
  )
}
