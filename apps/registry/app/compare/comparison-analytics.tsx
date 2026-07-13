'use client'

import { useEffect } from 'react'
import { trackRegistryEvent } from '@/lib/posthog-client'

export function ComparisonAnalytics({ agentIds }: { agentIds: string[] }) {
  const ids = agentIds.join(',')

  useEffect(() => {
    const selected = ids.split(',').filter(Boolean)
    trackRegistryEvent('registry_comparison_opened', {
      agent_ids: selected,
      agent_count: selected.length,
    })
  }, [ids])

  return null
}
