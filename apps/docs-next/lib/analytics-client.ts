'use client'

import { isTrackingAllowed } from './analytics-privacy'

const FIRST_TOUCH_STORAGE_KEY = 'agentskit_first_touch_v1'
const ANALYTICS_OPT_IN_STORAGE_KEY = 'agentskit_analytics_opt_in_v1'
const ALLOWLISTED_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ak_ref_source',
  'ak_ref_surface',
  'ak_destination',
] as const

export type AnalyticsEvent =
  | 'attribution_captured'
  | 'cta_clicked'
  | 'install_command_copied'
  | 'quickstart_started'
  | 'learn_step_started'
  | 'learn_step_completed'
  | 'quickstart_completed'
  | 'example_completed'
  | 'ask_docs_submitted'
  | 'ask_docs_completed'
  | 'ask_docs_error'

export type AnalyticsProperties = Record<string, string | number | boolean>

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_AdHigCcNs5kBxSnikA82npRQvaccEawirBsw79dfv3U4'
const POSTHOG_ENDPOINT = process.env.NEXT_PUBLIC_POSTHOG_PROXY_HOST ?? '/xk3.json'
const DISTINCT_ID_STORAGE_KEY = 'agentskit_analytics_distinct_id_v1'
let distinctId: string | null = null
let registeredProperties: AnalyticsProperties = {}

function explicitAnalyticsOptIn(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('ak_analytics') === 'on') {
      window.localStorage.setItem(ANALYTICS_OPT_IN_STORAGE_KEY, 'on')
      return true
    }
    return window.localStorage.getItem(ANALYTICS_OPT_IN_STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function trackingAllowed(): boolean {
  return typeof navigator === 'undefined' || isTrackingAllowed(navigator.doNotTrack, explicitAnalyticsOptIn())
}

function getDistinctId(): string {
  if (distinctId) return distinctId

  try {
    const stored = window.localStorage.getItem(DISTINCT_ID_STORAGE_KEY)
    if (stored) {
      distinctId = stored
      return stored
    }
  } catch {
    // Fall back to an in-memory anonymous ID when storage is blocked.
  }

  distinctId = globalThis.crypto?.randomUUID?.() ?? `ak_${Math.random().toString(36).slice(2)}${Date.now()}`
  try {
    window.localStorage.setItem(DISTINCT_ID_STORAGE_KEY, distinctId)
  } catch {
    // Analytics remains best-effort when storage is blocked.
  }
  return distinctId
}

function capture(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  const body = JSON.stringify({
    api_key: POSTHOG_KEY,
    uuid: globalThis.crypto?.randomUUID?.(),
    event,
    properties: {
      token: POSTHOG_KEY,
      distinct_id: getDistinctId(),
      $lib: 'agentskit-explicit-analytics',
      ...registeredProperties,
      ...properties,
    },
  })

  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon?.(POSTHOG_ENDPOINT, blob)) return
  } catch {
    // Fall through to keepalive fetch.
  }

  void fetch(POSTHOG_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never affect the product experience.
  })
}

function getAttributionSnapshot(): AnalyticsProperties | null {
  const params = new URLSearchParams(window.location.search)
  const snapshot: AnalyticsProperties = { landing_path: window.location.pathname }

  for (const key of ALLOWLISTED_KEYS) {
    const value = params.get(key)?.trim()
    if (value) snapshot[key] = value
  }

  if (document.referrer) {
    try {
      const referrerDomain = new URL(document.referrer).hostname
      if (referrerDomain) snapshot.referrer_domain = referrerDomain
    } catch {
      // Ignore malformed referrers; never send the raw value.
    }
  }

  const hasAttribution = Object.keys(snapshot).some(key => key !== 'landing_path')
  return hasAttribution ? snapshot : null
}

export function captureAttribution(): void {
  if (typeof window === 'undefined' || !trackingAllowed()) return

  const snapshot = getAttributionSnapshot()
  if (!snapshot) return

  let isFirstTouch = false
  try {
    isFirstTouch = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY) === null
    if (isFirstTouch) window.localStorage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage can be blocked; analytics should remain best-effort.
  }

  registeredProperties = { ...registeredProperties, ...snapshot }
  if (isFirstTouch) capture('attribution_captured', snapshot)
}

export function track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !trackingAllowed()) return
  capture(event, properties)
}
