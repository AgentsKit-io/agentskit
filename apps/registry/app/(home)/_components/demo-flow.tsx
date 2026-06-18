'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui'
import { categoryMeta } from './categories'

export interface DemoAgent { id: string; title: string; category: string; runnable?: boolean }

const ROWS = 5

export function DemoFlow({ agents, agentCount, categoryCount }: { agents: DemoAgent[]; agentCount: number; categoryCount: number }) {
  const N = agents.length
  const stageRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const [start, setStart] = useState(0)
  const [active, setActive] = useState(0)

  // cycle
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || N === 0) return
    const t = window.setInterval(() => {
      setActive((a) => {
        if (a + 1 >= ROWS) {
          setStart((s) => (s + ROWS) % N)
          return 0
        }
        return a + 1
      })
    }, 1100)
    return () => window.clearInterval(t)
  }, [N])

  // draw connector paths in pixels so they reach the rows
  useEffect(() => {
    const layout = () => {
      const stage = stageRef.current
      const core = coreRef.current
      const svg = svgRef.current
      if (!stage || !core || !svg) return
      const s = stage.getBoundingClientRect()
      if (s.width === 0) return
      svg.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`)
      const c = core.getBoundingClientRect()
      const sx = c.right - s.left
      const sy = c.top + c.height / 2 - s.top
      rowRefs.current.forEach((row, i) => {
        if (!row || !pathRefs.current[i]) return
        const r = row.getBoundingClientRect()
        const ex = r.left - s.left
        const ey = r.top + r.height / 2 - s.top
        const mx = sx + (ex - sx) * 0.5
        pathRefs.current[i]!.setAttribute('d', `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`)
      })
    }
    layout()
    const raf = requestAnimationFrame(layout)
    window.addEventListener('resize', layout)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', layout)
    }
  }, [])

  const current = agents[(start + active) % N]

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rg-reveal font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">How it works</div>
        <h2 className="rg-reveal mt-2 text-2xl font-bold tracking-tight text-ak-foam sm:text-3xl">
          One registry. Every agent drops in.
        </h2>
        <p className="rg-reveal mt-2 max-w-xl text-ak-graphite">
          Pick an agent, run one command, the source lands in your repo. Browse what ships ready-to-use.
        </p>

        <div ref={stageRef} className="rg-reveal relative mt-8 grid min-h-[320px] items-center gap-0 md:grid-cols-[300px_1fr]">
          <svg ref={svgRef} className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full md:block" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: ROWS }).map((_, i) => (
              <path key={i} ref={(el) => { pathRefs.current[i] = el }} className={`rg-line ${i === active ? 'active' : ''}`} />
            ))}
          </svg>

          {/* core */}
          <div ref={coreRef} className="relative z-10 rounded-xl border border-ak-border bg-ak-surface p-5 shadow-lg">
            <div className="flex items-center gap-2 text-ak-graphite">
              <span className="text-ak-blue"><Icon name="box" size={16} /></span>
              <span className="font-mono text-sm">registry</span>
            </div>
            <div className="mt-3 text-5xl font-extrabold leading-none tracking-tight text-ak-foam">{agentCount}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ak-graphite">
              {agentCount} agents · {categoryCount} categories · MIT
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-ak-border bg-ak-midnight px-3 py-2 font-mono text-[13px]">
              <code className="flex-1 truncate text-ak-foam">
                <span className="text-ak-blue">$</span> npx agentskit add <span className="text-ak-blue">{current?.id}</span>
              </code>
              <button
                type="button"
                data-copy={`npx agentskit add ${current?.id}`}
                aria-label="Copy"
                className="rg-copy inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ak-border bg-ak-surface text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam"
              >
                <span className="cp inline-flex"><Icon name="copy" size={14} /></span>
                <span className="ck"><Icon name="check" size={14} /></span>
              </button>
            </div>
            <p className="mt-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ak-graphite">zero lock-in</p>
          </div>

          {/* rows */}
          <ul className="relative z-10 grid w-full justify-self-end gap-2.5 pl-2 md:w-[min(420px,100%)]">
            {Array.from({ length: ROWS }).map((_, i) => {
              const a = agents[(start + i) % N]
              const isActive = i === active
              return (
                <li
                  key={i}
                  ref={(el) => { rowRefs.current[i] = el }}
                  className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 transition ${
                    isActive
                      ? 'border-ak-blue/55 bg-gradient-to-r from-ak-blue/10 to-transparent'
                      : 'border-ak-border bg-ak-surface'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-ak-blue ring-4 ring-ak-blue/15' : 'bg-ak-border'}`} />
                  <span className="truncate text-sm font-semibold text-ak-foam">{a?.title}</span>
                  <span className="ml-auto font-mono text-[11px] text-ak-graphite">{a ? categoryMeta(a.category).label : ''}</span>
                  {a?.runnable && <span className="text-[8px] text-ak-green">●</span>}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
