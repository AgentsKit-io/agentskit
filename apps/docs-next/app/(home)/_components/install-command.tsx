'use client'

import { useState } from 'react'

const CMD = 'npm install @agentskit/react'

export function InstallCommand() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(CMD)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-3 rounded-md border border-ak-border bg-ak-surface px-4 py-3 font-mono text-sm text-ak-foam transition hover:border-ak-blue"
    >
      <span className="text-ak-green">$</span>
      <span>{CMD}</span>
      <span
        className={`rounded border border-ak-border px-2 py-0.5 text-xs transition ${
          copied ? 'border-ak-green text-ak-green' : 'text-ak-graphite'
        }`}
      >
        {copied ? '✓ copied' : 'copy'}
      </span>
    </button>
  )
}
