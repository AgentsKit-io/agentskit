'use client'

import posthog from 'posthog-js'
import {
  FIRST_TOUCH_STORAGE_KEY,
  getAttributionSnapshot,
  isTrackingAllowed,
  type AnalyticsEvent,
  type AnalyticsProperties,
} from './analytics-contract'

let initialized = false
const ANALYTICS_OPT_IN_STORAGE_KEY = 'agentskit_analytics_opt_in_v1'
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_AdHigCcNs5kBxSnikA82npRQvaccEawirBsw79dfv3U4'
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

function trackingAllowed(): boolean {
  try {
    const explicitOptIn = new URLSearchParams(window.location.search).get('ak_analytics') === 'on'
    if (explicitOptIn) window.localStorage.setItem(ANALYTICS_OPT_IN_STORAGE_KEY, 'on')
    return typeof navigator === 'undefined' || isTrackingAllowed(
      navigator.doNotTrack,
      explicitOptIn || window.localStorage.getItem(ANALYTICS_OPT_IN_STORAGE_KEY) === 'on',
    )
  } catch {
    return typeof navigator === 'undefined' || isTrackingAllowed(navigator.doNotTrack)
  }
}

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined' || !trackingAllowed()) return
  initialized = true
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_exceptions: true,
    person_profiles: 'identified_only',
    // Share the analytics cookie across *.agentskit.io so a visitor stays the
    // same person as they move across the ecosystem (Hub PostHog project).
    cross_subdomain_cookie: true,
    // Explicit events are the measurement contract; broad DOM capture adds noise and text risk.
    autocapture: false,
  })
}

export function captureAttribution(): void {
  if (typeof window === 'undefined' || !trackingAllowed()) return

  const snapshot = getAttributionSnapshot(window.location, document.referrer)
  if (!snapshot) return

  let isFirstTouch = false
  try {
    isFirstTouch = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY) === null
    if (isFirstTouch) window.localStorage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage can be blocked; analytics should remain best-effort.
  }

  posthog.register(snapshot)
  if (isFirstTouch) posthog.capture('attribution_captured', snapshot)
}

export function track(event: AnalyticsEvent, props?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !trackingAllowed()) return
  posthog.capture(event, props)
}
