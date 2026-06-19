'use client'

import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

export interface MarkdownProps {
  /** Markdown source. May be a PARTIAL document while streaming. */
  content: string
  /** Marks the wrapper while tokens are still arriving (CSS hook only). */
  streaming?: boolean
}

/**
 * Free models often "cite" a page by writing a bare `[/docs/...]` bracket — valid
 * markdown link *text* with no destination, so it renders as literal `[/docs/...]`.
 * Turn a bare absolute-path bracket into a real link (`[/p](/p)`). The `(?!\()`
 * lookahead leaves already-complete `[text](/path)` links untouched; the closing
 * `]` requirement means a mid-stream partial isn't linkified until it's whole.
 */
function linkifyBarePaths(md: string): string {
  return md.replace(/\[(\/[^\]\s()]+)\](?!\()/g, '[$1]($1)')
}

/**
 * Markdown renderer for the Ask-the-docs chat.
 *
 * Streaming tolerance
 * -------------------
 * `content` is frequently a partial document (mid-stream). react-markdown parses
 * with remark, which is resilient by design: an unterminated fence is treated as
 * an open code block and its current text rendered as code rather than throwing.
 * We never assume a closed structure, render whatever parses on each tick, and
 * keep `data-ak-streaming` as a pure styling hook. No try/catch is needed — the
 * parser does not throw on truncated input — but the plain-text fallback inside
 * `CodeBlock` also covers any block whose lang hasn't resolved yet.
 *
 * Headless + tokenised: every color is an `--ak-*`-backed Tailwind class; no
 * hardcoded values. `data-ak-markdown` mirrors `@agentskit/react`'s hook.
 */
export function Markdown({ content, streaming = false }: MarkdownProps) {
  return (
    <div
      data-ak-markdown=""
      data-ak-streaming={streaming ? 'true' : undefined}
      className="ak-md space-y-2 text-sm leading-relaxed text-ak-foam"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }: ComponentPropsWithoutRef<'code'>) {
            const text = String(children ?? '').replace(/\n$/, '')
            const match = /language-(\w+)/.exec(className ?? '')
            // react-markdown v10 dropped the `inline` flag. A fence always sets
            // a `language-*` class; treat anything else without a newline as
            // inline code so short snippets stay in-line.
            if (!match && !text.includes('\n')) {
              return (
                <code className="rounded bg-ak-surface px-1 py-0.5 font-mono text-[0.85em] text-ak-blue">
                  {text}
                </code>
              )
            }
            return <CodeBlock code={text} lang={match?.[1]} />
          },
          pre({ children }: ComponentPropsWithoutRef<'pre'>) {
            // Block <code> is rendered by the `code` component above (as a
            // <div>-wrapping CodeBlock). Returning children raw avoids invalid
            // <div>-inside-<pre> nesting.
            return <>{children}</>
          },
          a({ href, children }: ComponentPropsWithoutRef<'a'>) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ak-blue underline underline-offset-2 hover:text-ak-foam"
              >
                {children}
              </a>
            )
          },
          ul({ children }: ComponentPropsWithoutRef<'ul'>) {
            return <ul className="my-1 list-disc space-y-1 pl-5">{children}</ul>
          },
          ol({ children }: ComponentPropsWithoutRef<'ol'>) {
            return <ol className="my-1 list-decimal space-y-1 pl-5">{children}</ol>
          },
          h1({ children }: ComponentPropsWithoutRef<'h1'>) {
            return <h2 className="mt-2 font-display text-base font-semibold text-ak-foam">{children}</h2>
          },
          h2({ children }: ComponentPropsWithoutRef<'h2'>) {
            return <h3 className="mt-2 font-display text-sm font-semibold text-ak-foam">{children}</h3>
          },
          h3({ children }: ComponentPropsWithoutRef<'h3'>) {
            return <h4 className="mt-1 font-display text-sm font-semibold text-ak-foam">{children}</h4>
          },
          blockquote({ children }: ComponentPropsWithoutRef<'blockquote'>) {
            return (
              <blockquote className="border-l-2 border-ak-border pl-3 text-ak-graphite">
                {children}
              </blockquote>
            )
          },
          table({ children }: ComponentPropsWithoutRef<'table'>) {
            return (
              <div className="my-2 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">{children}</table>
              </div>
            )
          },
          thead({ children }: ComponentPropsWithoutRef<'thead'>) {
            return <thead className="text-ak-foam">{children}</thead>
          },
          th({ children }: ComponentPropsWithoutRef<'th'>) {
            return <th className="border-b border-ak-border px-3 py-2 font-semibold">{children}</th>
          },
          td({ children }: ComponentPropsWithoutRef<'td'>) {
            return <td className="border-b border-ak-border px-3 py-2 align-top">{children}</td>
          },
          p({ children }: ComponentPropsWithoutRef<'p'>) {
            // Render paragraphs as <div> so block-level CodeBlock (a <div>) never
            // lands inside a <p>, which would be invalid and hydration-breaking.
            return <div>{children}</div>
          },
        }}
      >
        {linkifyBarePaths(content)}
      </ReactMarkdown>
    </div>
  )
}
