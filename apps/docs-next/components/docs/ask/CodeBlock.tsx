'use client'

import { useCallback, useEffect, useState } from 'react'
import { highlight } from './highlighter'

export interface CodeBlockProps {
  /** Raw source to render. */
  code: string
  /** Language hint (ts, tsx, js, json, bash, …). Defaults to plain text. */
  lang?: string
  /** When true, show a "Run" button wired to `onRun`. */
  runnable?: boolean
  /** Invoked with the current `code` when the Run button is pressed. */
  onRun?: (code: string) => void
}

/**
 * Shiki-highlighted code block for the Ask-the-docs chat.
 *
 * SSR-safe: highlighting runs in an effect (client only). Until shiki resolves
 * we render a plain, escaped `<pre>` so the block is readable during SSR, on
 * first paint, and as a permanent fallback if shiki fails to load.
 *
 * Headless: colors come from `--ak-*` tokens / `--shiki-*` vars via classes,
 * never hardcoded. The `data-ak-code-block` hook mirrors `@agentskit/react`.
 */
export function CodeBlock({ code, lang, runnable = false, onRun }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    highlight(code, lang)
      .then((out) => {
        if (active) setHtml(out)
      })
      .catch(() => {
        // Keep the plain fallback on any highlighter failure.
        if (active) setHtml(null)
      })
    return () => {
      active = false
    }
  }, [code, lang])

  const handleCopy = useCallback(() => {
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        /* clipboard may be unavailable (insecure context) — no-op */
      })
  }, [code])

  const handleRun = useCallback(() => {
    onRun?.(code)
  }, [code, onRun])

  return (
    <div
      data-ak-code-block=""
      data-ak-language={lang}
      className="group relative my-2 overflow-hidden rounded-md border border-ak-border bg-ak-surface"
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
        {runnable ? (
          <button
            type="button"
            onClick={handleRun}
            data-ak-run=""
            className="rounded border border-ak-border bg-ak-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ak-green hover:border-ak-green"
          >
            Run
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCopy}
          data-ak-copy=""
          aria-label="Copy code"
          className="rounded border border-ak-border bg-ak-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ak-graphite hover:border-ak-foam hover:text-ak-foam"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {html ? (
        <div
          className="ak-shiki overflow-x-auto p-3 font-mono text-xs [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-0"
          // shiki output is sanitised highlighter HTML built from `code`.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-3 font-mono text-xs text-ak-foam">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
