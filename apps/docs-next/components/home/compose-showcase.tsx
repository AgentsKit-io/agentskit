'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

type Token = { text: string; className?: string }

type Line = {
  indent: number
  tokens: Token[]
}

const KW = 'text-ak-blue'
const COMMENT = 'text-ak-graphite'
const PUNCT = 'text-ak-graphite'
const PROP = 'text-ak-foam'
const FN = 'text-ak-green'

/** The header + closing lines are always visible; the inner lines build up. */
const HEADER: Line = {
  indent: 0,
  tokens: [
    { text: 'const ', className: KW },
    { text: 'agent', className: PROP },
    { text: ' = ', className: PUNCT },
    { text: 'createResearchAgent', className: FN },
    { text: '({', className: PUNCT },
  ],
}

const FOOTER: Line = {
  indent: 0,
  tokens: [{ text: '})', className: PUNCT }],
}

/** Each progressive line introduces a new capability. */
const BUILD_LINES: Line[] = [
  {
    indent: 1,
    tokens: [
      { text: 'adapter', className: PROP },
      { text: ',', className: PUNCT },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: 'tools', className: PROP },
      { text: ': [', className: PUNCT },
      { text: 'webSearch', className: FN },
      { text: '(), ', className: PUNCT },
      { text: '...mcpTools', className: PROP },
      { text: '],', className: PUNCT },
      { text: '   // tools + MCP', className: COMMENT },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: 'retriever', className: PROP },
      { text: ': ', className: PUNCT },
      { text: 'rag', className: PROP },
      { text: '.', className: PUNCT },
      { text: 'retrieve', className: FN },
      { text: ',', className: PUNCT },
      { text: '             // RAG', className: COMMENT },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: 'memory', className: PROP },
      { text: ',', className: PUNCT },
      { text: '                              // context', className: COMMENT },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: 'onConfirm', className: PROP },
      { text: ',', className: PUNCT },
      { text: '                           // permissions (HITL/RBAC)', className: COMMENT },
    ],
  },
  {
    indent: 1,
    tokens: [
      { text: 'observers', className: PROP },
      { text: ',', className: PUNCT },
      { text: '                           // tracing', className: COMMENT },
    ],
  },
]

const STEP_MS = 900
const PAUSE_MS = 2200

function LineRow({ line, accent }: { line: Line; accent: boolean }) {
  return (
    <div
      className="whitespace-pre font-mono text-[13px] leading-6 sm:text-sm"
      style={{ paddingLeft: `${line.indent * 1.25}rem` }}
    >
      {line.tokens.map((tok, i) => (
        <span
          key={i}
          className={accent && tok.className === PROP ? `${KW} transition-colors` : `${tok.className ?? ''} transition-colors`}
        >
          {tok.text}
        </span>
      ))}
    </div>
  )
}

export function ComposeShowcase() {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(reduceMotion ? BUILD_LINES.length : 0)

  useEffect(() => {
    if (reduceMotion) {
      setVisible(BUILD_LINES.length)
      return
    }

    let timer: ReturnType<typeof setTimeout>

    const tick = (next: number) => {
      if (next > BUILD_LINES.length) {
        // full object shown — pause, then restart the loop
        timer = setTimeout(() => {
          setVisible(0)
          timer = setTimeout(() => tick(1), STEP_MS)
        }, PAUSE_MS)
        return
      }
      setVisible(next)
      timer = setTimeout(() => tick(next + 1), STEP_MS)
    }

    timer = setTimeout(() => tick(1), STEP_MS)
    return () => clearTimeout(timer)
  }, [reduceMotion])

  return (
    <div className="overflow-hidden rounded-xl border border-ak-border bg-ak-surface shadow-lg">
      {/* IDE window chrome */}
      <div className="flex items-center gap-2 border-b border-ak-border bg-ak-midnight/60 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-ak-graphite/50" />
        <span className="h-3 w-3 rounded-full bg-ak-graphite/50" />
        <span className="h-3 w-3 rounded-full bg-ak-graphite/50" />
        <span className="ml-3 font-mono text-xs text-ak-graphite">agent.ts</span>
      </div>

      {/* Code body */}
      <div className="bg-ak-midnight px-5 py-5 sm:px-6">
        <LineRow line={HEADER} accent={false} />

        {BUILD_LINES.map((line, idx) => {
          const isVisible = idx < visible
          const isNewest = idx === visible - 1

          if (reduceMotion) {
            return <LineRow key={idx} line={line} accent={false} />
          }

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={
                isVisible
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -8, transition: { duration: 0.15 } }
              }
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <LineRow line={line} accent={isNewest} />
            </motion.div>
          )
        })}

        <LineRow line={FOOTER} accent={false} />
      </div>
    </div>
  )
}
