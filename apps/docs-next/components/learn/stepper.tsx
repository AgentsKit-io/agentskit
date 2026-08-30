'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PROGRESS_KEY, STEPS, type Progress } from '@/lib/learn-steps'
import { track } from '@/lib/analytics-client'

function readProgress(): Progress {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeProgress(p: Progress) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  window.dispatchEvent(new CustomEvent('ak:learn-progress'))
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>({})
  useEffect(() => {
    setProgress(readProgress())
    const h = () => setProgress(readProgress())
    window.addEventListener('ak:learn-progress', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('ak:learn-progress', h)
      window.removeEventListener('storage', h)
    }
  }, [])
  const toggle = useCallback((key: string, value?: boolean) => {
    const current = readProgress()
    const next = { ...current, [key]: value ?? !current[key] }
    writeProgress(next)
  }, [])
  return { progress, toggle }
}

export function Stepper({ activeSlug }: { activeSlug?: string }) {
  const { progress } = useProgress()
  const done = STEPS.filter((s) => progress[s.key]).length
  const pct = Math.round((done / STEPS.length) * 100)

  return (
    <aside className="w-full shrink-0 md:w-64">
      <div className="mb-4 rounded-lg border border-ak-border bg-ak-surface p-3">
        <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
          <span>Progress</span>
          <span>{done}/{STEPS.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ak-midnight">
          <div className="h-full bg-ak-foam transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <nav>
        <ol className="flex flex-col gap-1">
          {STEPS.map((s, i) => {
            const isActive = s.slug === activeSlug
            const isDone = !!progress[s.key]
            return (
              <li key={s.slug}>
                <Link
                  href={`/learn/${s.slug}`}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                    isActive
                      ? 'border-ak-foam bg-ak-foam/10 text-ak-foam'
                      : 'border-transparent text-ak-graphite hover:border-ak-border hover:bg-ak-surface hover:text-ak-foam'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${
                      isDone
                        ? 'border-ak-foam bg-ak-foam text-ak-midnight'
                        : isActive
                          ? 'border-ak-foam text-ak-foam'
                          : 'border-ak-border text-ak-graphite'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>
    </aside>
  )
}

export function MarkStepDone({ stepKey, stepId, stepIndex }: { stepKey: string; stepId: string; stepIndex: number }) {
  const { progress, toggle } = useProgress()
  const done = !!progress[stepKey]
  const markDone = () => {
    if (!done) {
      track('learn_step_completed', {
        step_id: stepId,
        step_index: stepIndex,
        surface: 'learn',
      })

      const quickstartCompleted = STEPS.every((step) => step.key === stepKey || progress[step.key])
      if (quickstartCompleted) {
        track('quickstart_completed', {
          doc_slug: 'learn-agentskit',
          path_variant: 'interactive',
          step_count: STEPS.length,
          surface: 'learn',
        })
      }
    }
    toggle(stepKey, !done)
  }

  return (
    <button
      type="button"
      onClick={markDone}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
        done
          ? 'border border-ak-border bg-ak-surface text-ak-graphite'
          : 'bg-ak-foam text-ak-midnight hover:bg-white'
      }`}
    >
      {done ? '✓ Marked done' : 'Mark step as done'}
    </button>
  )
}
