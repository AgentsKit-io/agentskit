'use client'

import { useEffect } from 'react'
import { captureAttribution, initPostHog } from '@/lib/posthog-client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
    captureAttribution()
  }, [])
  return <>{children}</>
}
