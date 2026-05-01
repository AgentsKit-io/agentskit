'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SCENES, type WidgetKind, type Event } from './scenes'
import { WeatherCard, PriceCard, OrderTracker, FlightList } from './widgets'

type ToolState = { label: string; done: boolean; ms: number } | null

type Frame = {
  userDraft: string
  userMsg: string | null
  thinking: boolean
  tool: ToolState
  widget: WidgetKind | null
  assistant: string
}

const EMPTY: Frame = {
  userDraft: '',
  userMsg: null,
  thinking: false,
  tool: null,
  widget: null,
  assistant: '',
}

export function HeroDemo() {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [frame, setFrame] = useState<Frame>(EMPTY)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(m.matches)
  }, [])

  useEffect(() => {
    let cancelled = false
    let activeTimeout: ReturnType<typeof setTimeout> | null = null
    let cancelResolve: (() => void) | null = null

    const scene = SCENES[sceneIdx]
    let current: Frame = { ...EMPTY }
    setFrame(current)

    const sleep = (ms: number) =>
      new Promise<void>(resolve => {
        if (cancelled) return resolve()
        activeTimeout = setTimeout(() => {
          activeTimeout = null
          cancelResolve = null
          resolve()
        }, ms)
        cancelResolve = resolve
      })

    const patch = (next: Partial<Frame>) => {
      if (cancelled) return
      current = { ...current, ...next }
      setFrame(current)
    }

    const applyEvent = async (ev: Event) => {
      if (cancelled) return
      switch (ev.type) {
        case 'userType': {
          const cps = ev.cps ?? 32
          const step = 1000 / cps
          if (reducedMotion) {
            patch({ userDraft: ev.text })
            return
          }
          for (let i = 1; i <= ev.text.length; i++) {
            if (cancelled) return
            patch({ userDraft: ev.text.slice(0, i) })
            await sleep(step + (Math.random() * step) / 2)
          }
          return
        }
        case 'userSend':
          patch({ userMsg: current.userDraft, userDraft: '' })
          return
        case 'thinking':
          patch({ thinking: true })
          await sleep(reducedMotion ? 100 : 500)
          return
        case 'tool':
          patch({ tool: { label: ev.label, done: false, ms: ev.ms } })
          await sleep(reducedMotion ? 150 : ev.ms)
          if (cancelled) return
          patch({ tool: { label: ev.label, done: true, ms: ev.ms } })
          await sleep(reducedMotion ? 80 : 300)
          return
        case 'widget':
          patch({ widget: ev.kind, thinking: false })
          await sleep(reducedMotion ? 80 : 350)
          return
        case 'assistantStream': {
          const cps = ev.cps ?? 55
          const step = 1000 / cps
          if (reducedMotion) {
            patch({ assistant: ev.text })
            return
          }
          for (let i = 1; i <= ev.text.length; i++) {
            if (cancelled) return
            patch({ assistant: ev.text.slice(0, i) })
            await sleep(step)
          }
          return
        }
        case 'pause':
          await sleep(reducedMotion ? 200 : ev.ms)
          return
      }
    }

    const run = async () => {
      for (const ev of scene.events) {
        if (cancelled) return
        await applyEvent(ev)
        if (cancelled) return
      }
      await sleep(200)
      if (!cancelled) {
        setSceneIdx(i => (i + 1) % SCENES.length)
      }
    }

    run()

    return () => {
      cancelled = true
      if (activeTimeout) {
        clearTimeout(activeTimeout)
        activeTimeout = null
      }
      if (cancelResolve) {
        cancelResolve()
        cancelResolve = null
      }
    }
  }, [sceneIdx, reducedMotion])

  const selectScene = (i: number) => {
    if (i === sceneIdx) return
    setFrame(EMPTY)
    setSceneIdx(i)
  }

  const scrollRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [frame])

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-ak-border bg-ak-surface shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-ak-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ak-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f0b429]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ak-green/70" />
        </div>
        <span className="font-mono text-xs text-ak-graphite">chat.agentskit.io</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-ak-green">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ak-green" />
          live
        </span>
      </div>

      <div className="flex h-[380px] min-w-0 flex-col overflow-hidden bg-ak-midnight font-sans text-sm sm:h-[440px] md:h-[460px]">
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
          style={{ scrollbarWidth: 'thin' }}
        >
        {frame.userMsg && (
          <div className="flex min-w-0 justify-end">
            <div className="max-w-[80%] break-words rounded-2xl rounded-br-md bg-ak-blue/20 px-3.5 py-2 text-ak-foam">
              {frame.userMsg}
            </div>
          </div>
        )}

        {(frame.thinking || frame.tool || frame.widget || frame.assistant) && (
          <div className="flex w-full min-w-0 justify-start">
            <div className="flex w-full min-w-0 max-w-[92%] flex-col gap-2">
              {frame.thinking && !frame.widget && (
                <div className="flex items-center gap-2 text-ak-graphite">
                  <span className="inline-flex gap-1">
                    <Dot />
                    <Dot delay={150} />
                    <Dot delay={300} />
                  </span>
                </div>
              )}

              {frame.tool && (
                <div
                  className={`inline-flex max-w-full items-start gap-2 rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                    frame.tool.done
                      ? 'border-ak-green/30 bg-ak-green/5 text-ak-green'
                      : 'border-ak-blue/30 bg-ak-blue/5 text-ak-blue'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {frame.tool.done ? '✓' : <Spinner />}
                  </span>
                  <span className="min-w-0 break-all">{frame.tool.label}</span>
                  {frame.tool.done && (
                    <span className="shrink-0 text-ak-graphite">{frame.tool.ms}ms</span>
                  )}
                </div>
              )}

              {frame.widget && (
                <div key={frame.widget} className="min-w-0 max-w-full animate-fade-in">
                  {frame.widget === 'weather' && <WeatherCard />}
                  {frame.widget === 'price' && <PriceCard />}
                  {frame.widget === 'order' && <OrderTracker />}
                  {frame.widget === 'flight' && <FlightList />}
                </div>
              )}

              {frame.assistant && (
                <div
                  className="w-fit max-w-full rounded-2xl rounded-bl-md bg-ak-surface px-3.5 py-2 text-left text-ak-foam"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', textAlign: 'left' }}
                >
                  {frame.assistant}
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-ak-blue" />
                </div>
              )}
            </div>
          </div>
        )}

        </div>

        <div className="flex min-w-0 items-center gap-2 border-t border-ak-border bg-ak-surface px-3 py-2.5">
          <span className="shrink-0 font-mono text-xs text-ak-graphite">›</span>
          <span className="min-w-0 flex-1 truncate text-ak-foam">
            {frame.userDraft}
            {frame.userDraft && (
              <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-ak-foam" />
            )}
            {!frame.userDraft && <span className="text-ak-graphite">ask anything…</span>}
          </span>
          <kbd className="rounded border border-ak-border px-1.5 py-0.5 font-mono text-[10px] text-ak-graphite">
            ⏎
          </kbd>
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-ak-border bg-ak-surface px-4 py-2.5">
        <div className="flex flex-wrap justify-center gap-1.5">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectScene(i)}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition ${
                i === sceneIdx
                  ? 'bg-ak-blue/20 text-ak-blue'
                  : 'text-ak-graphite hover:text-ak-foam'
              }`}
            >
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                  i === sceneIdx ? 'bg-ak-blue' : 'bg-ak-border'
                }`}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ak-graphite"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ak-blue border-t-transparent" />
  )
}
