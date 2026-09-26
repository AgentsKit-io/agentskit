'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, CopyButton } from './ui'

function CodeBox({ code, installAgent, highlighted }: { code: string; installAgent?: string; highlighted: ReactNode }) {
  return (
    <div className="relative">
      <pre className="h-[168px] overflow-auto rounded-lg border border-[#222b38] bg-[#0d1117] p-4 font-mono text-[13px] leading-relaxed text-[#e6edf3]">
        <code data-syntax-highlight>{highlighted}</code>
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton value={code} variant="icon" analytics={installAgent ? { agentId: installAgent, surface: 'guide' } : undefined} />
      </div>
    </div>
  )
}

const WIRE = `import { openai } from '@agentskit/adapters'
import { createResearchAgent } from './agents/research/agent'

const agent = createResearchAgent({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY! }),
})`
const RUN = `const { content } = await agent.run(
  'What changed in the EU AI Act in 2025?',
)
console.log(content)`

const HIGHLIGHTED = [
  <><span className="text-[#79c0ff]">npx</span> <span className="text-[#a5d6ff]">@agentskit/cli</span> add <span className="text-[#7ee787]">research</span></>,
  <><span className="text-[#ff7b72]">import</span> {'{ openai }'} <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'@agentskit/adapters'</span>{'\n'}<span className="text-[#ff7b72]">import</span> {'{ createResearchAgent }'} <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'./agents/research/agent'</span>{'\n\n'}<span className="text-[#ff7b72]">const</span> agent = <span className="text-[#d2a8ff]">createResearchAgent</span>({'{'}{'\n'}  adapter: <span className="text-[#d2a8ff]">openai</span>({'{'} apiKey: process.env.<span className="text-[#79c0ff]">OPENAI_API_KEY</span>! {'}'}),{'\n'}{'})'}</>,
  <><span className="text-[#ff7b72]">const</span> {'{ content }'} = <span className="text-[#ff7b72]">await</span> agent.<span className="text-[#d2a8ff]">run</span>({'\n'}  <span className="text-[#a5d6ff]">'What changed in the EU AI Act in 2025?'</span>,{'\n'}){'\n'}console.<span className="text-[#d2a8ff]">log</span>(content)</>,
]

const STEPS = [
  { n: 1, t: 'Add it', d: 'Run one command. The CLI copies the full agent source into ./agents/<id>/ in your repo. From here, the code is yours — read it, edit it, commit it.', code: 'npx @agentskit/cli add research', highlighted: HIGHLIGHTED[0] },
  { n: 2, t: 'Wire it', d: 'Create research.ts with the copied factory and any adapter — OpenAI, Anthropic, or one of 184+ catalog providers. Swap the model whenever you want.', code: WIRE, highlighted: HIGHLIGHTED[1] },
  { n: 3, t: 'Run it anywhere', d: 'Call agent.run() from Node, a serverless function, an edge runtime, or your terminal. It is your code on your infrastructure — nothing phones home to this registry.', code: RUN, highlighted: HIGHLIGHTED[2] },
]

function RunTerminal() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDone(true)
      return
    }
    let alive = true
    const cycle = () => {
      if (!alive) return
      setDone(false)
      window.setTimeout(() => alive && setDone(true), 1900)
    }
    cycle()
    const t = window.setInterval(cycle, 3800)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [])
  return (
    <div className="mt-3.5 overflow-hidden rounded-lg border border-ak-green/35 bg-[#0d1117]">
      <div className="flex items-center gap-1.5 border-b border-[#222b38] bg-[#161b22] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f56' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#27c93f' }} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-ak-graphite">
          <Icon name="terminal" size={13} /> Your code · your stack
        </span>
      </div>
      <div className="grid gap-2 px-4 py-3.5 font-mono text-[13px] text-[#e6edf3]">
        <div><span className="text-ak-blue">$</span> <span className="text-[#79c0ff]">npx</span> tsx research.ts</div>
        <div className="flex min-h-[18px] items-center gap-2.5 text-ak-graphite">
          {done ? (
            <span className="inline-flex text-ak-green"><Icon name="check" size={14} /></span>
          ) : (
            <span className="h-3 w-3 rounded-full border-2 border-[#222b38] border-t-ak-blue rg-spin" />
          )}
          <span className={done ? 'text-ak-green' : ''}>
            {done ? 'done — answer with 5 cited sources' : 'running research agent…'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function InstallSteps() {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="rg-reveal font-mono text-xs uppercase tracking-[0.2em] text-ak-blue">From catalog to owned source</div>
        <h2 className="rg-reveal mt-2 text-2xl font-bold tracking-tight text-ak-foam sm:text-3xl">One command. The code is yours.</h2>
        <p className="rg-reveal mt-2 max-w-xl text-ak-graphite">Three steps from registry to running in your own stack — no lock-in, no hidden runtime.</p>

        <ol className="mt-8 grid gap-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rg-reveal grid items-start gap-6 rounded-xl border border-ak-border bg-ak-surface p-6 md:grid-cols-[360px_1fr]">
              <div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-ak-blue font-bold text-ak-on-blue">{s.n}</div>
                <h3 className="mt-3.5 text-xl font-bold text-ak-foam">{s.t}</h3>
                <p className="mt-2 text-sm text-ak-graphite">{s.d}</p>
              </div>
              <div className="min-w-0">
                <CodeBox code={s.code} highlighted={s.highlighted} installAgent={s.n === 1 ? 'research' : undefined} />
                {s.n === 3 && <RunTerminal />}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
