'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const COMMAND =
  '$ npx agentskit add research --run "What changed in the EU AI Act in 2025?"'

const OUTPUT_LINES: { text: string; tone: 'success' | 'muted' | 'stream' | 'prompt' }[] = [
  { text: '✓ added ./agents/research  ·  running via openai…', tone: 'success' },
  {
    text: '> The 2025 amendments tightened GPAI transparency… [source]',
    tone: 'stream',
  },
  { text: '', tone: 'muted' },
  {
    text: '$ npx agentskit ai "a support agent for my SaaS"',
    tone: 'prompt',
  },
  { text: '# …or scaffold your own from a one-line description', tone: 'muted' },
]

const TYPE_MS = 38
const OUTPUT_STAGGER_MS = 520
const HOLD_MS = 4200

type Phase = 'typing' | 'output' | 'hold'

export function CliShowcase() {
  const reduced = useReducedMotion()
  const [typed, setTyped] = useState('')
  const [visibleLines, setVisibleLines] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (reduced) return

    const clearAll = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms))
    }

    let cancelled = false

    const runCycle = () => {
      if (cancelled) return
      setTyped('')
      setVisibleLines(0)

      // Phase: typing
      let i = 0
      const typeNext = () => {
        if (cancelled) return
        i += 1
        setTyped(COMMAND.slice(0, i))
        if (i < COMMAND.length) {
          schedule(typeNext, TYPE_MS)
        } else {
          // Phase: output stagger
          OUTPUT_LINES.forEach((_, idx) => {
            schedule(
              () => setVisibleLines(idx + 1),
              OUTPUT_STAGGER_MS * (idx + 1),
            )
          })
          // Phase: hold, then loop
          schedule(
            runCycle,
            OUTPUT_STAGGER_MS * (OUTPUT_LINES.length + 1) + HOLD_MS,
          )
        }
      }
      schedule(typeNext, TYPE_MS)
    }

    runCycle()

    return () => {
      cancelled = true
      clearAll()
    }
  }, [reduced])

  const showStatic = reduced
  const displayCommand = showStatic ? COMMAND : typed
  const displayLines = showStatic ? OUTPUT_LINES.length : visibleLines
  const commandComplete = showStatic || typed.length === COMMAND.length

  return (
    <div className="rounded-xl border border-ak-border bg-ak-surface/40 font-mono text-sm shadow-lg shadow-black/20">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-ak-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
        <span className="ml-2 select-none text-xs text-ak-graphite">
          agentskit — zsh
        </span>
      </div>

      {/* Terminal body */}
      <div className="space-y-1.5 px-4 py-4 leading-relaxed">
        <p className="break-words text-ak-foam">
          <span>{displayCommand}</span>
          {!commandComplete && <Cursor />}
        </p>

        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {OUTPUT_LINES.slice(0, displayLines).map((line, idx) => (
              <motion.p
                key={idx}
                initial={showStatic ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className={
                  line.tone === 'success'
                    ? 'break-words text-ak-green'
                    : line.tone === 'prompt'
                      ? 'break-words text-ak-foam'
                      : 'break-words text-ak-graphite'
                }
              >
                {line.text}
                {!showStatic &&
                  line.tone === 'stream' &&
                  idx === displayLines - 1 && <Cursor />}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Cursor() {
  const reduced = useReducedMotion()
  if (reduced) {
    return (
      <span className="ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-ak-blue/80" />
    )
  }
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] bg-ak-blue"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}
