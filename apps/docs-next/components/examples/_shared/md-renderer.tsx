'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'

/**
 * Markdown renderer used across showcase examples.
 * react-markdown + remark-gfm handles tables, task lists, strikethrough, etc.
 * Fenced code blocks are rendered by fumadocs' DynamicCodeBlock for shiki
 * syntax highlighting consistent with the rest of the docs.
 */
export function MdRenderer({ content }: { content: string }) {
  return (
    <div data-ak-md className="ak-md space-y-2 text-sm text-ak-foam">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const text = String(children ?? '').replace(/\n$/, '')
            const match = /language-(\w+)/.exec(className ?? '')
            // react-markdown v9 dropped the `inline` flag. Treat anything
            // without a `language-*` class (and no newline) as inline.
            if (!match && !text.includes('\n')) {
              return (
                <code className="rounded bg-ak-midnight px-1 py-0.5 font-mono text-[0.85em] text-ak-blue">
                  {text}
                </code>
              )
            }
            return <DynamicCodeBlock lang={match?.[1] ?? 'text'} code={text} />
          },
          pre({ children }) {
            // Block <code> is rendered directly by the `code` component above.
            // Returning the children raw avoids nesting <div> (DynamicCodeBlock)
            // inside <pre> or the surrounding <p>.
            return <>{children}</>
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-ak-blue underline">
                {children}
              </a>
            )
          },
          table({ children }) {
            return (
              <div className="my-2 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">{children}</table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-ak-midnight/60 text-ak-foam">{children}</thead>
          },
          th({ children }) {
            return <th className="border-b border-ak-border px-3 py-2 font-semibold">{children}</th>
          },
          td({ children }) {
            return <td className="border-b border-ak-border px-3 py-2 align-top">{children}</td>
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-ak-border pl-3 text-ak-graphite">
                {children}
              </blockquote>
            )
          },
          ul({ children }) {
            return <ul className="my-1 list-disc space-y-1 pl-5">{children}</ul>
          },
          ol({ children }) {
            return <ol className="my-1 list-decimal space-y-1 pl-5">{children}</ol>
          },
          h1({ children }) {
            return <h2 className="mt-2 font-display text-lg font-semibold text-ak-foam">{children}</h2>
          },
          h2({ children }) {
            return <h3 className="mt-2 font-display text-base font-semibold text-ak-foam">{children}</h3>
          },
          h3({ children }) {
            return <h4 className="mt-1 font-display text-sm font-semibold text-ak-foam">{children}</h4>
          },
          p({ children }) {
            // Render every paragraph as a div to avoid invalid nesting when
            // fenced code blocks (rendered as <figure>/<div> via DynamicCodeBlock)
            // land inside a <p> because of react-markdown's default wrapping.
            return <div className="leading-relaxed">{children}</div>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
