'use client'

import { useEffect, useRef, useState } from 'react'
import { trackRegistryEvent } from '@/lib/posthog-client'
import { copyText } from '@/lib/clipboard'
import { Icon } from '../../(home)/_components/ui'

export function InstallCommand({ agentId, command }: { agentId: string; command: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    const copied = await copyText(command)
    if (copied) {
      trackRegistryEvent('registry_install_command_copied', { agent_id: agentId, surface: 'agent_detail' })
    }
    window.clearTimeout(timer.current)
    setStatus(copied ? 'copied' : 'error')
    timer.current = window.setTimeout(() => setStatus('idle'), 1600)
  }

  const copied = status === 'copied'
  const label = copied ? 'Install command copied' : status === 'error' ? 'Copy failed, try again' : 'Copy install command'

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-ak-foam">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-ak-border text-ak-graphite hover:border-ak-blue hover:text-ak-foam"
      >
        <Icon name={copied ? 'check' : 'copy'} size={15} />
      </button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? 'Copied' : status === 'error' ? 'Copy failed' : ''}</span>
    </div>
  )
}
