'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdRenderer } from './_shared/md-renderer'

/**
 * A fancy "agent pipeline" visualiser. Pick a scenario; each step animates
 * from pending → running → complete with icon, duration, and a result preview.
 * A final streamed markdown report lands at the bottom. No network — everything
 * is scripted so the demo stays snappy and deterministic.
 */

type StepStatus = 'pending' | 'running' | 'complete' | 'error'

type StepDef = {
  name: string
  icon: string
  summary: string
  ms: number
  preview: string
}

type Scenario = {
  id: string
  label: string
  tagline: string
  goal: string
  steps: StepDef[]
  report: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'launch',
    label: 'Plan a launch',
    tagline: 'Research → positioning → draft',
    goal: 'Plan the AgentsKit 2.0 launch',
    steps: [
      {
        name: 'market.research',
        icon: '🔭',
        summary: 'Scanned competitors and baseline demand',
        ms: 620,
        preview: '8 competitors · 3 price tiers · 2 market gaps',
      },
      {
        name: 'audience.segment',
        icon: '🎯',
        summary: 'Identified 3 launch audiences',
        ms: 480,
        preview: 'indie-hackers · platform-teams · AI-first-startups',
      },
      {
        name: 'positioning.write',
        icon: '✍️',
        summary: 'Produced a 1-sentence positioning',
        ms: 540,
        preview: '"The agent toolkit JavaScript deserves."',
      },
      {
        name: 'assets.generate',
        icon: '🖼️',
        summary: 'Drafted hero + 3 bullets + OG image copy',
        ms: 720,
        preview: 'hero.md · bullets.md · og.txt',
      },
    ],
    report: `### Launch plan — AgentsKit 2.0

**Positioning.** *The agent toolkit JavaScript deserves.*

**Audiences.**
- Indie hackers shipping fast
- Platform teams standardising internal AI UX
- AI-first startups swapping providers weekly

**Top assets.**
1. Hero paragraph (142 words, confident tone)
2. Three killer bullets — shared stack, tool-first streaming, 19 providers
3. OG image copy ready for /api/og

\`\`\`ts
await publish('blog/agentskit-2-0.mdx', { status: 'scheduled' })
\`\`\``,
  },
  {
    id: 'triage',
    label: 'Ship a fix',
    tagline: 'Diff → patch → PR',
    goal: 'Fix the reported streaming race condition',
    steps: [
      {
        name: 'logs.search',
        icon: '🪵',
        summary: 'Correlated 3 error events in Sentry',
        ms: 420,
        preview: 'issue #AK-204 · 18 users · last 2h',
      },
      {
        name: 'code.locate',
        icon: '🔍',
        summary: 'Traced the offending read path',
        ms: 540,
        preview: 'packages/core/src/controller.ts:412',
      },
      {
        name: 'patch.write',
        icon: '🧰',
        summary: 'Proposed a minimal diff',
        ms: 620,
        preview: '-3 / +6 lines',
      },
      {
        name: 'tests.run',
        icon: '✅',
        summary: 'Unit + integration suites green',
        ms: 880,
        preview: '412 tests · 0 failed · 1.2s',
      },
      {
        name: 'pr.open',
        icon: '🚀',
        summary: 'Opened draft PR #512',
        ms: 360,
        preview: 'fix(core): guard abort during flush',
      },
    ],
    report: `### PR ready

**Branch.** \`fix/stream-abort-guard\` · **Draft PR #512**

**Diff summary.**

\`\`\`diff
- if (abortController.signal.aborted) return
+ if (abortController.signal.aborted) {
+   emitter.emit({ type: 'done' })
+   return
+ }
\`\`\`

- All 412 tests green in 1.2s
- No public API change
- Ships behind the existing \`streaming\` capability flag

Ready for a human review.`,
  },
  {
    id: 'research',
    label: 'Research a topic',
    tagline: 'Search → read → synthesise',
    goal: 'Compare TypeScript runtime type systems',
    steps: [
      {
        name: 'web.search',
        icon: '🌐',
        summary: 'Pulled 12 high-signal sources',
        ms: 560,
        preview: 'zod · valibot · arktype · typebox · effect-schema',
      },
      {
        name: 'pages.read',
        icon: '📚',
        summary: 'Ingested 48k tokens of docs',
        ms: 780,
        preview: '12 pages · 48,214 tokens',
      },
      {
        name: 'facts.extract',
        icon: '🧠',
        summary: 'Structured 37 comparable data points',
        ms: 640,
        preview: 'bundle size · perf · ecosystem',
      },
      {
        name: 'report.compose',
        icon: '📝',
        summary: 'Drafted a side-by-side summary',
        ms: 580,
        preview: '720 words · 1 table · 3 recommendations',
      },
    ],
    report: `### TS runtime schemas — quick compare

| Lib | Bundle (min) | Inference quality | Ecosystem |
| --- | --- | --- | --- |
| zod | ~12kb | great | massive |
| valibot | ~2kb | great | growing |
| arktype | ~5kb | excellent | small |
| typebox | ~3kb | good | tight |
| effect-schema | ~30kb | excellent | effect-world |

**Recommendation.**

1. **Default to zod** when you want breadth + docs
2. **Reach for valibot** for bundle-sensitive apps (landing pages, edge functions)
3. **Prototype with arktype** when you need Typescript-flavoured DSL ergonomics

> For AgentsKit's docs we keep using *zod* — the breadth wins over 8 extra kb.`,
  },
]

export function AgentActions() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id)
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]
  const [statuses, setStatuses] = useState<StepStatus[]>(() =>
    scenario.steps.map(() => 'pending'),
  )
  const [durations, setDurations] = useState<(number | null)[]>(() =>
    scenario.steps.map(() => null),
  )
  const [report, setReport] = useState('')
  const [running, setRunning] = useState(false)
  const cancelRef = useRef(false)

  const reset = useCallback(() => {
    cancelRef.current = true
    setStatuses(scenario.steps.map(() => 'pending'))
    setDurations(scenario.steps.map(() => null))
    setReport('')
    setRunning(false)
  }, [scenario])

  // Reset when scenario changes.
  useEffect(() => {
    reset()
  }, [scenarioId, reset])

  const run = useCallback(async () => {
    if (running) return
    cancelRef.current = false
    setRunning(true)
    setReport('')
    setStatuses(scenario.steps.map(() => 'pending'))
    setDurations(scenario.steps.map(() => null))

    for (let i = 0; i < scenario.steps.length; i++) {
      if (cancelRef.current) break
      setStatuses((prev) => prev.map((s, j) => (j === i ? 'running' : s)))
      const startedAt = performance.now()
      await sleep(scenario.steps[i].ms)
      if (cancelRef.current) break
      setDurations((prev) => prev.map((d, j) => (j === i ? Math.round(performance.now() - startedAt) : d)))
      setStatuses((prev) => prev.map((s, j) => (j === i ? 'complete' : s)))
      await sleep(150)
    }

    if (!cancelRef.current) {
      const text = scenario.report
      for (let i = 1; i <= text.length; i++) {
        if (cancelRef.current) break
        setReport(text.slice(0, i))
        await sleep(6)
      }
    }
    setRunning(false)
  }, [scenario, running])

  const stop = useCallback(() => {
    cancelRef.current = true
    setRunning(false)
  }, [])

  const progress = useMemo(() => {
    const done = statuses.filter((s) => s === 'complete').length
    return (done / scenario.steps.length) * 100
  }, [statuses, scenario])

  return (
    <div
      data-ak-example
      className="flex h-[620px] flex-col overflow-hidden rounded-xl border border-ak-border bg-ak-surface"
    >
      <header className="border-b border-ak-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
              Agent pipeline
            </div>
            <div className="mt-0.5 font-display text-sm font-semibold text-ak-foam">
              {scenario.goal}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioId(s.id)}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition ${
                  s.id === scenario.id
                    ? 'border-ak-foam bg-ak-foam/15 text-ak-foam'
                    : 'border-ak-border text-ak-graphite hover:text-ak-foam'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-ak-midnight/40">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ak-blue via-ak-foam to-ak-green transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
            {scenario.tagline}
          </span>
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="rounded border border-ak-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ak-red hover:bg-ak-red/10"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={run}
              className="rounded bg-ak-foam px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ak-midnight hover:bg-ak-foam/90"
            >
              {progress >= 100 ? 'Re-run' : 'Run'}
            </button>
          )}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 md:grid-cols-[1.1fr_1fr]">
        <ol className="flex flex-col gap-2">
          {scenario.steps.map((step, i) => (
            <StepCard
              key={step.name}
              step={step}
              status={statuses[i]}
              durationMs={durations[i]}
            />
          ))}
        </ol>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-midnight/40">
          <div className="flex items-center justify-between border-b border-ak-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
            <span>Report</span>
            <span>{report.length}c</span>
          </div>
          <div className="flex-1 overflow-auto p-3 text-sm">
            {report ? (
              <MdRenderer content={report} />
            ) : (
              <div className="flex h-full items-center justify-center text-center font-mono text-[11px] text-ak-graphite">
                Report streams here once the pipeline finishes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({
  step,
  status,
  durationMs,
}: {
  step: StepDef
  status: StepStatus
  durationMs: number | null
}) {
  const running = status === 'running'
  const done = status === 'complete'
  return (
    <li
      className={`flex items-start gap-3 rounded-lg border p-3 transition ${
        running
          ? 'border-ak-blue/40 bg-ak-blue/5'
          : done
          ? 'border-ak-green/30 bg-ak-green/5'
          : 'border-ak-border bg-ak-midnight/20'
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg ${
          running
            ? 'bg-ak-blue/15'
            : done
            ? 'bg-ak-green/15'
            : 'bg-ak-midnight/40'
        }`}
      >
        {running ? <Spinner /> : done ? '✓' : step.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[12px] text-ak-foam">{step.name}</span>
          <span className="font-mono text-[10px] text-ak-graphite">
            {durationMs != null ? `${durationMs}ms` : running ? '…' : ''}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-ak-graphite">{step.summary}</div>
        {done || running ? (
          <div className="mt-1.5 rounded border border-ak-border/80 bg-ak-midnight/60 px-2 py-1 font-mono text-[10px] text-ak-foam">
            {step.preview}
          </div>
        ) : null}
      </div>
    </li>
  )
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ak-blue border-t-transparent" />
  )
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}
