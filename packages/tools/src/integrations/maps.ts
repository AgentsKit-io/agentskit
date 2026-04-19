import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface MapsConfig extends HttpToolOptions {
  /** User-Agent — Nominatim requires one identifying your app. */
  userAgent?: string
}

/**
 * OpenStreetMap / Nominatim geocoding. Free, no API key, usage
 * bounded by the public policy — pass `userAgent` identifying your
 * app. For heavier use, self-host Nominatim or swap in Google Maps.
 */
export function mapsGeocode(config: MapsConfig = {}) {
  const base: HttpToolOptions = {
    baseUrl: config.baseUrl ?? 'https://nominatim.openstreetmap.org',
    headers: {
      'user-agent': config.userAgent ?? 'agentskit-maps/1.0',
      ...config.headers,
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
  return defineTool({
    name: 'maps_geocode',
    description: 'Geocode a text location into latitude/longitude.',
    schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    } as const,
    async execute({ query }) {
      const result = await httpJson<Array<{ lat: string; lon: string; display_name: string }>>(base, {
        path: '/search',
        query: { q: String(query), format: 'json', limit: 1 },
      })
      const hit = result[0]
      if (!hit) return null
      return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name }
    },
  })
}

export function mapsReverseGeocode(config: MapsConfig = {}) {
  const base: HttpToolOptions = {
    baseUrl: config.baseUrl ?? 'https://nominatim.openstreetmap.org',
    headers: {
      'user-agent': config.userAgent ?? 'agentskit-maps/1.0',
      ...config.headers,
    },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
  return defineTool({
    name: 'maps_reverse_geocode',
    description: 'Resolve a coordinate pair into a human-readable address.',
    schema: {
      type: 'object',
      properties: { lat: { type: 'number' }, lon: { type: 'number' } },
      required: ['lat', 'lon'],
    } as const,
    async execute({ lat, lon }) {
      const result = await httpJson<{ display_name?: string; address?: Record<string, unknown> }>(base, {
        path: '/reverse',
        query: { lat: String(lat), lon: String(lon), format: 'json' },
      })
      return { label: result.display_name, address: result.address }
    },
  })
}

export function maps(config: MapsConfig = {}) {
  return [mapsGeocode(config), mapsReverseGeocode(config)]
}
