'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics-client'

export function LearnStepAnalytics({ stepId, stepIndex }: { stepId: string; stepIndex: number }) {
  useEffect(() => {
    const storageKey = `agentskit:learn-started:${stepId}`
    try {
      if (window.sessionStorage.getItem(storageKey)) return
      window.sessionStorage.setItem(storageKey, '1')
    } catch {
      // Analytics remains best-effort when browser storage is blocked.
    }

    track(stepId === 'install' ? 'quickstart_started' : 'learn_step_started', {
      doc_slug: 'learn-agentskit',
      path_variant: 'interactive',
      step_id: stepId,
      step_index: stepIndex,
      surface: 'learn',
    })
  }, [stepId, stepIndex])

  return null
}
