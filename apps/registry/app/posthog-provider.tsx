'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, trackRegistryPageView } from '@/lib/posthog-client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    trackRegistryPageView(pathname)
  }, [pathname])

  return <>{children}</>
}
