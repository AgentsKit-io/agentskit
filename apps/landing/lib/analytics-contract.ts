export const FIRST_TOUCH_STORAGE_KEY = 'agentskit_first_touch_v1'
export const INTERNAL_REF_SOURCE = 'agentskit'

export function isTrackingAllowed(
  doNotTrack: string | null | undefined,
  explicitOptIn = false,
): boolean {
  return explicitOptIn || doNotTrack !== '1'
}

export type AnalyticsEvent =
  | 'attribution_captured'
  | 'cta_clicked'
  | 'ecosystem_clicked'
  | 'community_clicked'
  | 'install_command_copied'

export type AnalyticsProperty = string | number | boolean | undefined
export type AnalyticsProperties = Record<string, AnalyticsProperty>

export type AttributionSnapshot = {
  landing_path: string
  referrer_domain?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  ak_ref_source?: string
  ak_ref_surface?: string
  ak_destination?: string
}

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ak_ref_source',
  'ak_ref_surface',
  'ak_destination',
] as const

export function getAttributionSnapshot(
  location: Pick<Location, 'pathname' | 'search'>,
  referrer: string,
): AttributionSnapshot | null {
  const params = new URLSearchParams(location.search)
  const snapshot: AttributionSnapshot = { landing_path: location.pathname }

  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim()
    if (value) snapshot[key] = value
  }

  if (referrer) {
    try {
      const domain = new URL(referrer).hostname
      if (domain) snapshot.referrer_domain = domain
    } catch {
      // Ignore malformed referrers; never send the raw value.
    }
  }

  const hasAttribution = ATTRIBUTION_KEYS.some(key => snapshot[key]) || snapshot.referrer_domain
  return hasAttribution ? snapshot : null
}

/** Add internal navigation context without replacing acquisition UTMs. */
export function withInternalReference(url: string, refSurface: string, destination: string): string {
  try {
    const target = new URL(url)
    target.searchParams.set('ak_ref_source', INTERNAL_REF_SOURCE)
    target.searchParams.set('ak_ref_surface', refSurface)
    target.searchParams.set('ak_destination', destination)
    return target.toString()
  } catch {
    return url
  }
}
