'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

type OutputTone = 'success' | 'muted' | 'stream'

type CliFlow = {
  id: string
  label: string
  command: string
  output: { text: string; tone: OutputTone }[]
}

const FLOWS: CliFlow[] = [
  {
    id: 'add',
    label: 'Add',
    command: '$ npx agentskit add research --run "Summarize today’s AI news"',
    output: [
      { text: '✓ copied source to ./agents/research', tone: 'success' },
      { text: '✓ installed dependencies · running…', tone: 'success' },
      { text: '> Here are the developments that matter… [sources]', tone: 'stream' },
    ],
  },
  {
    id: 'ai',
    label: 'Create',
    command: '$ npx agentskit ai "a support agent with RAG and approvals"',
    output: [
      { text: '✓ generated a typed AgentSchema', tone: 'success' },
      { text: '✓ added tools · retriever · memory · onConfirm', tone: 'success' },
      { text: '→ edit ./agents/support/agent.ts', tone: 'muted' },
    ],
  },
  {
    id: 'run',
    label: 'Run',
    command: '$ npx agentskit run "Summarize today’s PRs" --provider anthropic',
    output: [
      { text: '✓ provider anthropic · streaming', tone: 'success' },
      { text: '> 4 pull requests need review; 2 are ready to merge…', tone: 'stream' },
      { text: '✓ run completed', tone: 'muted' },
    ],
  },
  {
    id: 'doctor',
    label: 'Diagnose',
    command: '$ npx agentskit doctor',
    output: [
      { text: '✓ runtime packages', tone: 'success' },
      { text: '✓ provider configuration', tone: 'success' },
      { text: '✓ environment ready to run agents', tone: 'success' },
    ],
  },
]

const TYPE_MS = 24
const OUTPUT_STAGGER_MS = 420
const HOLD_MS = 3000

export function CliShowcase() {
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [typed, setTyped] = useState('')
  const [visibleLines, setVisibleLines] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeFlow = FLOWS[activeIndex]

  useEffect(() => {
    if (reduced || !playing) return

    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms))
    }

    let cancelled = false
    setTyped('')
    setVisibleLines(0)

    let characterIndex = 0
    const typeNext = () => {
      if (cancelled) return
      characterIndex += 1
      setTyped(activeFlow.command.slice(0, characterIndex))

      if (characterIndex < activeFlow.command.length) {
        schedule(typeNext, TYPE_MS)
        return
      }

      activeFlow.output.forEach((_, lineIndex) => {
        schedule(
          () => setVisibleLines(lineIndex + 1),
          OUTPUT_STAGGER_MS * (lineIndex + 1),
        )
      })

      schedule(
        () => setActiveIndex((current) => (current + 1) % FLOWS.length),
        OUTPUT_STAGGER_MS * (activeFlow.output.length + 1) + HOLD_MS,
      )
    }

    schedule(typeNext, TYPE_MS)

    return () => {
      cancelled = true
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [activeFlow, playing, reduced])

  const showStatic = Boolean(reduced) || !playing
  const displayCommand = showStatic ? activeFlow.command : typed
  const displayLines = showStatic ? activeFlow.output.length : visibleLines
  const commandComplete = showStatic || typed.length === activeFlow.command.length

  const selectFlow = (index: number) => {
    setActiveIndex(index)
    setPlaying(false)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ak-border bg-ak-surface/40 font-mono text-sm shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 border-b border-ak-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden />
        <span className="ml-2 select-none text-xs text-ak-graphite">
          agentskit — zsh
        </span>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            className="ml-auto min-h-11 px-2 text-[11px] uppercase tracking-[0.12em] text-ak-graphite transition hover:text-ak-foam focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ak-blue"
            aria-label={playing ? 'Pause CLI demo' : 'Play CLI demo'}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto border-b border-ak-border px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FLOWS.map((flow, index) => {
          const active = index === activeIndex
          return (
            <button
              key={flow.id}
              type="button"
              onClick={() => selectFlow(index)}
              aria-pressed={active}
              className={`relative min-h-11 shrink-0 px-3 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ak-blue ${
                active ? 'text-ak-foam' : 'text-ak-graphite hover:text-ak-foam'
              }`}
            >
              {flow.label}
              {active && (
                <motion.span
                  layoutId="cli-active-flow"
                  className="absolute inset-x-2 bottom-0 h-px bg-ak-blue"
                  transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
                />
              )}
            </button>
          )
        })}
        <span className="ml-auto hidden items-center pr-3 text-[10px] text-ak-graphite/60 sm:flex">
          also: init · chat · dev
        </span>
      </div>

      <div className="min-h-[13.5rem] space-y-2 px-4 py-5 leading-relaxed sm:min-h-[14.5rem]">
        <p className="break-words text-ak-foam">
          <span>{displayCommand}</span>
          {!commandComplete && <Cursor />}
        </p>

        <div className="space-y-1.5 pt-2">
          <AnimatePresence initial={false}>
            {activeFlow.output.slice(0, displayLines).map((line) => (
              <motion.p
                key={`${activeFlow.id}-${line.text}`}
                initial={showStatic ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
                className={
                  line.tone === 'success'
                    ? 'break-words text-ak-green'
                    : line.tone === 'stream'
                      ? 'break-words text-ak-foam'
                      : 'break-words text-ak-graphite'
                }
              >
                {line.text}
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
