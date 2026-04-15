'use client'

import { useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * PostHog setup for AgentsKit docs.
 *
 * Opt-in per environment via NEXT_PUBLIC_POSTHOG_KEY. When unset, PostHog
 * never loads — keeps localhost and CI free of telemetry.
 *
 * Respects Do-Not-Track: if the browser sends DNT, the client is put in
 * opt-out mode after init and no events are sent.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialized = useRef(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    if (initialized.current) return
    initialized.current = true

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,   // we do it manually below so Next.js route changes are tracked
      capture_pageleave: true,
      person_profiles: 'identified_only',
      opt_out_persistence_by_default: false,
      respect_dnt: true,
    })
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    if (typeof window === 'undefined') return

    const query = searchParams?.toString()
    const url = query ? `${pathname}?${query}` : pathname
    posthog.capture('$pageview', {
      $current_url: url,
      section: inferSection(pathname ?? ''),
    })
  }, [pathname, searchParams])

  return <>{children}</>
}

function inferSection(pathname: string): string {
  if (pathname === '/') return 'home'
  const match = pathname.match(/^\/docs(?:\/([^/]+))?/)
  if (!match) return 'other'
  return match[1] ?? 'docs-root'
}

/**
 * Track a named custom event. Safe to call when PostHog is disabled —
 * no-op in that case.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  if (typeof window === 'undefined') return
  posthog.capture(event, properties)
}
