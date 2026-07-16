'use client'

import { useState } from 'react'

const STEPS: { label: string; command: string; subtext: string; recommended?: boolean }[] = [
  {
    label: 'Start fresh',
    command: 'npx @agentskit/cli init',
    recommended: true,
    subtext:
      'Scaffold a UI binding, terminal, or runtime starter via @agentskit/cli — not product Chat. For versioned multi-surface chat apps use AgentsKit Chat (@agentskit/chat-cli) at chat.agentskit.io.',
  },
  {
    label: 'Add to a project',
    command: 'npm install @agentskit/core @agentskit/adapters',
    subtext: 'The 5 KB substrate. Works in browser, Node, Deno, Bun — anywhere JS runs.',
  },
  {
    label: 'Run a built agent',
    command: 'npx @agentskit/cli add research --run',
    subtext: 'Copy a ready-made agent from the registry and run it on any provider.',
  },
] as const

export function InstallCommand({ withSubtext = false }: { withSubtext?: boolean }) {
  const [active, setActive] = useState(0)
  const step = STEPS[active]

  return (
    <div className="w-full min-w-0">
      <div
        role="tablist"
        aria-label="Install options"
        className="flex flex-wrap items-center gap-1 rounded-lg bg-ak-surface/40 p-1"
      >
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition sm:text-xs ${
              i === active
                ? 'bg-ak-surface text-ak-foam'
                : 'text-ak-graphite hover:text-ak-foam'
            }`}
          >
            {s.label}
            {s.recommended && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-ak-green"
                title="Recommended"
                aria-label="recommended"
              />
            )}
          </button>
        ))}
      </div>

      <CommandLine command={step.command} />

      {withSubtext && (
        <p className="mt-2 text-xs leading-snug text-ak-graphite">{step.subtext}</p>
      )}
    </div>
  )
}

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group mt-2 flex w-full min-w-0 items-center gap-2 rounded-md bg-ak-surface/50 px-2.5 py-2.5 text-left font-mono text-[11px] text-ak-foam transition hover:bg-ak-surface sm:gap-3 sm:px-3 sm:text-[13px] md:text-sm"
    >
      <span className="shrink-0 text-ak-green">$</span>
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {command}
      </span>
      <span
        className={`shrink-0 rounded px-2 py-0.5 text-[11px] transition sm:text-xs ${
          copied ? 'text-ak-green' : 'text-ak-graphite group-hover:text-ak-foam'
        }`}
      >
        {copied ? '✓ copied' : 'copy'}
      </span>
    </button>
  )
}
