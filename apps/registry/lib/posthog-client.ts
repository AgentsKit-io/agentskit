'use client'

import posthog from 'posthog-js'

let initialized = false

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  initialized = true
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_exceptions: true,
    person_profiles: 'always',
    // Share the analytics cookie across *.agentskit.io so a visitor stays the
    // same person as they move across the ecosystem (Hub PostHog project).
    cross_subdomain_cookie: true,
    autocapture: true,
  })
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture(event, props)
}
