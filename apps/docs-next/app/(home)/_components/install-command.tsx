'use client'

import { useState } from 'react'

const SCAFFOLD = 'npx agentskit init'
const ADD = 'npm install @agentskit/core @agentskit/adapters'

export function InstallCommand() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <Card
        label="Start fresh"
        command={SCAFFOLD}
        subtext="4 templates · zero-config demo provider · agentskit dev hot-reloads your agent"
        primary
      />
      <Card
        label="Add to a project"
        command={ADD}
        subtext="The 5 KB substrate. Works in browser, Node, Deno, Bun — anywhere JS runs."
      />
    </div>
  )
}

function Card({
  label,
  command,
  subtext,
  primary = false,
}: {
  label: string
  command: string
  subtext: string
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
      className={`flex flex-col gap-2 rounded-md border p-3 text-left transition ${
        primary
          ? 'border-ak-blue/40 bg-ak-surface'
          : 'border-ak-border bg-ak-surface/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-ak-graphite">
          {label}
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
        className="group inline-flex items-center gap-3 rounded-md border border-ak-border bg-ak-midnight px-3 py-2 font-mono text-sm text-ak-foam transition hover:border-ak-blue"
      >
        <span className="text-ak-green">$</span>
        <span className="flex-1 truncate">{command}</span>
        <span
          className={`rounded border border-ak-border px-2 py-0.5 text-xs transition ${
            copied ? 'border-ak-green text-ak-green' : 'text-ak-graphite'
          }`}
        >
          {copied ? '✓ copied' : 'copy'}
        </span>
      </button>
      <p className="text-xs leading-snug text-ak-graphite">{subtext}</p>
    </div>
  )
}
