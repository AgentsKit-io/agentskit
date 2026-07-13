export type QueryLengthBucket = '1-10' | '11-25' | '26-50' | '51+'

export interface RegistryAnalyticsEvents {
  registry_agent_opened: {
    agent_id: string
    category: string
    reviewed: boolean
    runnable: boolean
  }
  registry_catalog_filter_changed: {
    filter: 'category' | 'reviewed' | 'runnable' | 'sort' | 'clear'
    value: string | boolean
  }
  registry_catalog_search_used: {
    query_length: QueryLengthBucket
    result_count: number
  }
  registry_compare_selection_changed: {
    action: 'added' | 'removed' | 'cleared'
    agent_id?: string
    selected_count: number
  }
  registry_comparison_opened: {
    agent_ids: string[]
    agent_count: number
  }
  registry_install_command_copied: {
    agent_id: string
    surface: 'catalog' | 'hero' | 'agent_detail' | 'guide'
  }
  registry_agent_feedback_submitted: {
    agent_id: string
    response: 'helpful' | 'not_helpful'
  }
}

export type RegistryAnalyticsEvent = keyof RegistryAnalyticsEvents

export interface AnalyticsCapture {
  event: string
  properties: Record<string, unknown>
  $set?: Record<string, unknown>
  $set_once?: Record<string, unknown>
}

const URL_PROPERTIES = new Set(['$current_url', '$initial_current_url', '$session_entry_url'])
const DROPPED_PROPERTIES = new Set([
  '$element_text',
  '$elements',
  '$referrer',
  '$initial_referrer',
  'ph_keyword',
  'gclid',
  'gad_source',
  'fbclid',
  'msclkid',
  'dclid',
  'gbraid',
  'wbraid',
])

const EVENT_PROPERTIES: Partial<Record<RegistryAnalyticsEvent, ReadonlySet<string>>> = {
  registry_agent_opened: new Set(['agent_id', 'category', 'reviewed', 'runnable']),
  registry_catalog_filter_changed: new Set(['filter', 'value']),
  registry_catalog_search_used: new Set(['query_length', 'result_count']),
  registry_compare_selection_changed: new Set(['action', 'agent_id', 'selected_count']),
  registry_comparison_opened: new Set(['agent_ids', 'agent_count']),
  registry_install_command_copied: new Set(['agent_id', 'surface']),
  registry_agent_feedback_submitted: new Set(['agent_id', 'response']),
}
const SAFE_SDK_PROPERTIES = new Set(['token', 'distinct_id'])

export function queryLengthBucket(length: number): QueryLengthBucket {
  if (length <= 10) return '1-10'
  if (length <= 25) return '11-25'
  if (length <= 50) return '26-50'
  return '51+'
}

export function sanitizeAnalyticsUrl(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return value
  try {
    const url = new URL(value, 'https://registry.agentskit.io')
    return url.pathname
  } catch {
    return undefined
  }
}

export function sanitizeAnalyticsCapture<T extends AnalyticsCapture | null>(capture: T): T {
  if (!capture) return capture
  const allowed = EVENT_PROPERTIES[capture.event as RegistryAnalyticsEvent]

  const sanitizeProperties = (source: Record<string, unknown> | undefined, allowEventProperties: boolean) => {
    if (!source) return source
    const properties: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(source)) {
      if (DROPPED_PROPERTIES.has(key) || /^utm_/i.test(key) || /^\$exception_/i.test(key)) continue
      if (URL_PROPERTIES.has(key)) {
        const sanitized = sanitizeAnalyticsUrl(value)
        if (sanitized !== undefined) properties[key] = sanitized
        continue
      }
      if (key === '$set' || key === '$set_once') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          properties[key] = sanitizeProperties(value as Record<string, unknown>, false)
        }
        continue
      }
      if (SAFE_SDK_PROPERTIES.has(key) || (allowEventProperties && allowed?.has(key))) {
        properties[key] = value
      }
    }
    return properties
  }

  const properties = sanitizeProperties(capture.properties, true) ?? {}
  return {
    ...capture,
    properties,
    ...(capture.$set ? { $set: sanitizeProperties(capture.$set, false) } : {}),
    ...(capture.$set_once ? { $set_once: sanitizeProperties(capture.$set_once, false) } : {}),
  } as T
}
