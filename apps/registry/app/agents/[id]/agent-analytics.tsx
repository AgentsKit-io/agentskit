'use client'

import { useEffect } from 'react'
import { trackRegistryEvent } from '@/lib/posthog-client'

export function AgentAnalytics({
  agentId,
  category,
  reviewed,
  runnable,
}: {
  agentId: string
  category: string
  reviewed: boolean
  runnable: boolean
}) {
  useEffect(() => {
    trackRegistryEvent('registry_agent_opened', {
      agent_id: agentId,
      category,
      reviewed,
      runnable,
    })
  }, [agentId, category, reviewed, runnable])

  return null
}
