'use client'

import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { counts } from '@/lib/ecosystem-stats'

type CodeRow = {
  id: string
  property: string
  variants: readonly string[]
  comment: string
  step: number
}

type DemoStep = {
  id: string
  label: string
  eyebrow: string
  title: string
  description: string
  proof: string
}

const CODE_ROWS: readonly CodeRow[] = [
  {
    id: 'adapter',
    property: 'adapter',
    variants: [
      "anthropic({ model: 'claude-sonnet-4-6' })",
      "openai({ model: 'gpt-4o' })",
      "kimi({ model: 'kimi-k2.5' })",
    ],
    comment: `${counts.catalogProviders} providers · ${counts.catalogModels.toLocaleString('en-US')} models`,
    step: 0,
  },
  {
    id: 'tools',
    property: 'tools',
    variants: [
      '[webSearch()]',
      '[webSearch(), ...github()]',
      '[webSearch(), ...github(), ...slack()]',
    ],
    comment: `${counts.integrations} integrations + MCP`,
    step: 1,
  },
  {
    id: 'retriever',
    property: 'retriever',
    variants: ['docsRag', 'hybridRag', 'productKnowledge'],
    comment: 'any Retriever plugs in',
    step: 2,
  },
  {
    id: 'memory',
    property: 'memory',
    variants: [
      "fileChatMemory('./history.json')",
      "sqliteChatMemory({ path: './agent.db' })",
      'redisChatMemory({ client })',
    ],
    comment: `${counts.memoryBackends} backends`,
    step: 3,
  },
  {
    id: 'on-confirm',
    property: 'onConfirm',
    variants: ['approveSensitiveActions'],
    comment: 'HITL · deny by default',
    step: 4,
  },
  {
    id: 'delegates',
    property: 'delegates',
    variants: ['{ researcher, coder, reviewer }'],
    comment: 'multi-agent, same runtime',
    step: 5,
  },
] as const

const STEPS: readonly DemoStep[] = [
  {
    id: 'model',
    label: 'Model',
    eyebrow: '01 · Connect a model',
    title: 'Change the model. Keep the agent.',
    description: 'OpenAI, Anthropic, Gemini, Kimi, local models, or your own adapter use one contract.',
    proof: `${counts.nativeAdapters} native adapters · ${counts.catalogProviders} providers · ${counts.catalogModels.toLocaleString('en-US')} models`,
  },
  {
    id: 'tools',
    label: 'Tools',
    eyebrow: '02 · Give it actions',
    title: 'Connect the work your agent needs to do.',
    description: 'Add built-in tools, full integration families, MCP servers, or a function you already own.',
    proof: `${counts.integrations} integrations · custom tools · MCP`,
  },
  {
    id: 'rag',
    label: 'RAG',
    eyebrow: '03 · Ground every answer',
    title: 'Bring your own knowledge.',
    description: 'RAG, BM25, web search, code search, and hybrid retrieval share one narrow interface.',
    proof: 'chunk · embed · retrieve · cite',
  },
  {
    id: 'memory',
    label: 'Memory',
    eyebrow: '04 · Keep useful context',
    title: 'Start local. Scale the backend later.',
    description: 'Conversation history and vector recall stay separate, swappable, and easy to test.',
    proof: `${counts.memoryBackends} memory backends`,
  },
  {
    id: 'safety',
    label: 'Safety',
    eyebrow: '05 · Control sensitive actions',
    title: 'Automation with an approval boundary.',
    description: 'Confirmation gates stop sensitive tools before execution and deny when no approver exists.',
    proof: 'HITL · RBAC · sandboxing · guardrails',
  },
  {
    id: 'team',
    label: 'Team',
    eyebrow: '06 · Delegate the work',
    title: 'One agent or a coordinated team.',
    description: 'Planner, researcher, coder, and reviewer become delegates without replacing the runtime.',
    proof: 'ReAct · planning · delegation · multi-agent',
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    eyebrow: '07 · Deliver the experience',
    title: 'Build the agent once. Meet users anywhere.',
    description: 'The same foundation powers product experiences across browser, desktop, terminal, and mobile.',
    proof: 'Web · Desktop · CLI · Mobile',
  },
] as const

const VALUE_STEP_MS = 900
const SLIDE_HOLD_MS = 2500

export function HeroDemo() {
  const reduceMotion = useReducedMotion()
  const [activeStep, setActiveStep] = useState(0)
  const [variantIndex, setVariantIndex] = useState(0)
  const [manualPaused, setManualPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const paused = Boolean(reduceMotion) || manualPaused || hovered || focusWithin
  const step = STEPS[activeStep]

  const activeRow = useMemo(
    () => CODE_ROWS.find((row) => row.step === activeStep),
    [activeStep],
  )

  useEffect(() => {
    setVariantIndex(0)
  }, [activeStep])

  useEffect(() => {
    if (paused) return

    const timers: number[] = []
    const variants = activeRow?.variants.length ?? 1

    for (let index = 1; index < variants; index += 1) {
      timers.push(window.setTimeout(() => setVariantIndex(index), VALUE_STEP_MS * index))
    }

    const slideDuration = Math.max(
      4300,
      VALUE_STEP_MS * Math.max(1, variants - 1) + SLIDE_HOLD_MS,
    )
    timers.push(
      window.setTimeout(() => {
        setActiveStep((current) => (current + 1) % STEPS.length)
      }, slideDuration),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [activeRow, activeStep, paused])

  const selectStep = (index: number) => {
    setVariantIndex(0)
    setActiveStep(index)
  }

  return (
    <div
      className="min-w-0 overflow-hidden rounded-xl border border-ak-border bg-ak-surface shadow-2xl shadow-black/30"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={() => setFocusWithin(false)}
    >
      <div className="flex items-center justify-between border-b border-ak-border bg-ak-midnight/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ak-red/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f0b429]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-ak-green/80" />
          <span className="ml-2 font-mono text-[11px] text-ak-graphite">agent.ts</span>
        </div>
        {!reduceMotion ? (
          <button
            type="button"
            onClick={() => setManualPaused((current) => !current)}
            aria-label={manualPaused ? 'Play demo' : 'Pause demo'}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ak-graphite transition hover:text-ak-foam"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${paused ? 'bg-ak-graphite' : 'bg-ak-green'}`} />
            {manualPaused ? 'play' : hovered || focusWithin ? 'paused' : 'playing'}
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ak-graphite">
            manual
          </span>
        )}
      </div>

      <div className="h-[250px] overflow-hidden bg-ak-midnight px-4 py-5 sm:px-5">
        <div className="min-w-0 font-mono text-[11px] leading-6 sm:text-xs">
          <div>
            <span className="text-ak-blue">const</span>{' '}
            <span className="text-ak-foam">runtime</span>{' '}
            <span className="text-ak-graphite">=</span>{' '}
            <span className="text-ak-green">createRuntime</span>
            <span className="text-ak-graphite">({'{'}</span>
          </div>

          {CODE_ROWS.filter((row) => row.step <= activeStep).map((row) => {
            const isActive = row.step === activeStep
            const valueIndex = isActive
              ? Math.min(variantIndex, row.variants.length - 1)
              : row.variants.length - 1
            const value = row.variants[valueIndex]

            return (
              <div
                key={row.id}
                className={`rounded-sm pl-4 transition-colors duration-200 ${
                  !reduceMotion && isActive ? 'animate-fade-in' : ''
                } ${
                  isActive ? 'bg-ak-blue/8' : ''
                }`}
              >
                <div className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-1">
                  <span className={isActive ? 'text-ak-blue' : 'text-ak-foam'}>
                    {row.property}:
                  </span>
                  <span
                    key={value}
                    className={`${isActive ? 'text-ak-green' : 'text-ak-graphite'} ${
                      !reduceMotion && isActive ? 'animate-fade-in' : ''
                    } truncate`}
                  >
                    {value},
                  </span>
                </div>
                {isActive ? (
                  <div className="pl-[6.75rem] text-[10px] leading-4 text-ak-graphite/55">
                    {'// '}{row.comment}
                  </div>
                ) : null}
              </div>
            )
          })}

          <div className={activeStep === STEPS.length - 1 ? 'text-ak-blue' : 'text-ak-graphite'}>
            {'})'}
            {activeStep === STEPS.length - 1 ? (
              <span className="ml-4 text-ak-graphite/60">
                {'// one runtime → every surface'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-ak-border bg-ak-surface/65 px-4 py-4 sm:px-5">
          <div key={step.id} className={`min-h-32 ${!reduceMotion ? 'animate-fade-in' : ''}`}>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ak-blue">
              {step.eyebrow}
            </div>
            <h3 className="mt-2 text-base font-semibold leading-tight text-ak-foam sm:text-lg">
              {step.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ak-graphite sm:text-sm">
              {step.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] text-ak-green">{step.proof}</span>
              {activeStep === STEPS.length - 1 ? <SurfaceRail /> : null}
            </div>
          </div>
      </div>

      <div className="border-t border-ak-border bg-ak-midnight px-2 py-2">
        <div
          className="flex min-w-0 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectStep(index)}
              aria-current={index === activeStep ? 'step' : undefined}
              className={`relative shrink-0 rounded px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] transition sm:flex-1 ${
                index === activeStep
                  ? 'bg-ak-surface text-ak-foam'
                  : index < activeStep
                    ? 'text-ak-green'
                    : 'text-ak-graphite hover:text-ak-foam'
              }`}
            >
              {index < activeStep ? <span aria-hidden="true">✓ </span> : null}
              {item.label}
              {index === activeStep ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-px bg-ak-blue"
                />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SurfaceRail() {
  return (
    <span aria-label="Supported surfaces" className="flex gap-1">
      {['Web', 'Desktop', 'CLI', 'Mobile'].map((surface) => (
        <span
          key={surface}
          className="border border-ak-border bg-ak-midnight px-1.5 py-0.5 font-mono text-[8px] text-ak-foam"
        >
          {surface}
        </span>
      ))}
    </span>
  )
}
