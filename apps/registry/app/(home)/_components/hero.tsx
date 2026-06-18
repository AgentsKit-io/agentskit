'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui'

const GH = 'https://github.com/AgentsKit-io/agentskit-registry'

export function Hero({ agentCount, categoryCount, sampleIds }: { agentCount: number; categoryCount: number; sampleIds: string[] }) {
  const [cmd, setCmd] = useState(`npx agentskit add ${sampleIds[0] ?? 'research'}`)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || sampleIds.length === 0) return
    let i = 0
    let alive = true
    const prefix = 'npx agentskit add '
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const loop = async () => {
      while (alive) {
        const full = prefix + sampleIds[i % sampleIds.length]
        for (let c = prefix.length; c <= full.length && alive; c++) {
          setCmd(full.slice(0, c))
          await sleep(55)
        }
        await sleep(1900)
        for (let c = full.length; c >= prefix.length && alive; c--) {
          setCmd(full.slice(0, c))
          await sleep(22)
        }
        i++
      }
    }
    loop()
    return () => {
      alive = false
    }
  }, [sampleIds])

  return (
    <section className="relative isolate overflow-hidden px-4 pt-20 pb-16 text-center sm:px-6">
      <div className="rg-aurora" />
      <div className="rg-grid" />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
        <h1 className="text-[2.2rem] font-bold leading-[1.08] tracking-tight text-ak-foam sm:text-5xl md:text-6xl">
          The shadcn for AI agents.
          <span className="mt-1 block bg-gradient-to-r from-ak-blue via-sky-400 to-violet-500 bg-clip-text text-transparent">
            Copy the source. Own the code.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-ak-graphite sm:text-lg">
          Like shadcn/ui, but for agents. One command copies a production-grade agent into your project — you own the
          code, edit it freely, no framework dependency, no lock-in.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#agents"
            className="inline-flex items-center gap-2 rounded-lg bg-ak-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Browse agents <Icon name="arrow-right" size={17} />
          </a>
          <a
            href={GH}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-ak-border bg-ak-surface px-4 py-2.5 text-sm font-semibold text-ak-foam transition hover:border-ak-blue"
          >
            <Icon name="github" size={16} /> View on GitHub
          </a>
        </div>

        <div className="mt-9 w-full max-w-[560px] overflow-hidden rounded-xl border border-ak-border bg-ak-surface text-left shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-ak-border px-3.5 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f56' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#27c93f' }} />
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-ak-graphite">
              <Icon name="terminal" size={13} /> install
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-4 font-mono text-sm">
            <code className="text-ak-foam">
              <span className="text-ak-blue">$</span>{' '}
              <span ref={ref} className="rg-caret">
                {cmd}
              </span>
            </code>
            <button
              type="button"
              data-copy={cmd}
              aria-label="Copy install command"
              className="rg-copy inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ak-border bg-ak-midnight text-ak-graphite transition hover:border-ak-blue hover:text-ak-foam"
            >
              <span className="cp inline-flex"><Icon name="copy" size={15} /></span>
              <span className="ck"><Icon name="check" size={15} /></span>
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ak-graphite">
          <span><b className="text-ak-foam">{agentCount}</b> agents</span>
          <span className="hidden h-5 w-px bg-ak-border sm:inline-block" />
          <span><b className="text-ak-foam">{categoryCount}</b> categories</span>
          <span className="hidden h-5 w-px bg-ak-border sm:inline-block" />
          <span><b className="text-ak-foam">∞</b> you own the code</span>
        </div>
      </div>
    </section>
  )
}
