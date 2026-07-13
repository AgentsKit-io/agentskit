'use client'

import posthog from 'posthog-js'
import { sanitizeAnalyticsCapture, sanitizeAnalyticsUrl } from './analytics'
import type { RegistryAnalyticsEvent, RegistryAnalyticsEvents } from './analytics'

let initialized = false

export function initPostHog(): boolean {
  if (initialized) return true
  if (typeof window === 'undefined') return false
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return false
  try {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      person_profiles: 'never',
      // Share the analytics cookie across *.agentskit.io so a visitor stays the
      // same person as they move across the ecosystem (Hub PostHog project).
      cross_subdomain_cookie: true,
      autocapture: false,
      advanced_disable_flags: true,
      disable_conversations: true,
      disable_external_dependency_loading: true,
      disable_product_tours: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      save_referrer: false,
      save_campaign_params: false,
      before_send: sanitizeAnalyticsCapture,
    })
    initialized = true
    return true
  } catch {
    return false
  }
}

export function trackRegistryEvent<Event extends RegistryAnalyticsEvent>(
  event: Event,
  props: RegistryAnalyticsEvents[Event],
): void {
  if (initPostHog()) posthog.capture(event, props)
}

export function trackRegistryPageView(pathname: string): void {
  if (initPostHog()) posthog.capture('$pageview', { $current_url: sanitizeAnalyticsUrl(pathname) })
}
