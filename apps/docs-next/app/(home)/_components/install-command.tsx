'use client'

import { useState } from 'react'

const SCAFFOLD = 'npx @agentskit/cli init'
const ADD = 'npm install @agentskit/core @agentskit/adapters'
const RUN_AGENT = 'npx @agentskit/cli add research --run'

const SUBTEXT = {
  scaffold: 'Scaffold a chat, terminal, or runtime starter — zero-config demo provider, hot-reload included.',
  add: 'The 5 KB substrate. Works in browser, Node, Deno, Bun — anywhere JS runs.',
  run: 'Copy a ready-made agent from the registry and run it on any provider.',
}

export function InstallCommand({ withSubtext = false }: { withSubtext?: boolean }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      <Card
        step={1}
        label="Start fresh"
        command={SCAFFOLD}
        subtext={withSubtext ? SUBTEXT.scaffold : undefined}
        primary
      />
      <Card
        step={2}
        label="Add to a project"
        command={ADD}
        subtext={withSubtext ? SUBTEXT.add : undefined}
      />
      <Card
        step={3}
        label="Run a built agent"
        command={RUN_AGENT}
        subtext={withSubtext ? SUBTEXT.run : undefined}
      />
    </div>
  )
}

function Card({
  step,
  label,
  command,
  subtext,
  primary = false,
}: {
  step: number
  label: string
  command: string
  subtext?: string
  primary?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`flex w-full min-w-0 flex-col gap-2 rounded-md border p-3 text-left transition ${
        primary
          ? 'border-ak-blue/40 bg-ak-surface'
          : 'border-ak-border bg-ak-surface/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-ak-border font-mono text-[10px] text-ak-graphite">
            {step}
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-ak-graphite">
            {label}
          </span>
        </span>
        {primary && (
          <span className="rounded-full border border-ak-blue/40 px-2 py-0.5 font-mono text-[10px] text-ak-blue">
            recommended
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={copy}
        className="group flex w-full min-w-0 items-center gap-2 rounded-md border border-ak-border bg-ak-midnight px-2.5 py-2 text-left font-mono text-[11px] text-ak-foam transition hover:border-ak-blue sm:gap-3 sm:px-3 sm:text-[13px] md:text-sm"
      >
        <span className="shrink-0 text-ak-green">$</span>
        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {command}
        </span>
        <span
          className={`shrink-0 rounded border border-ak-border px-2 py-0.5 text-[11px] transition sm:text-xs ${
            copied ? 'border-ak-green text-ak-green' : 'text-ak-graphite'
          }`}
        >
          {copied ? '✓ copied' : 'copy'}
        </span>
      </button>
      {subtext ? (
        <p className="text-xs leading-snug text-ak-graphite">{subtext}</p>
      ) : null}
    </div>
  )
}
