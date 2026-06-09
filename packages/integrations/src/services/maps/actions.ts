import { defineAction } from '../../contract'

export const mapsGeocode = defineAction({
  name: 'maps_geocode',
  description: 'Geocode a text location into latitude/longitude.',
  sideEffect: 'read',
  schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  async execute(args, { http }) {
    const result = await http<Array<{ lat: string; lon: string; display_name: string }>>({
      path: '/search',
      query: { q: String(args.query), format: 'json', limit: 1 },
    })
    const hit = result[0]
    if (!hit) return null
    return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name }
  },
})

export const mapsReverseGeocode = defineAction({
  name: 'maps_reverse_geocode',
  description: 'Resolve a coordinate pair into a human-readable address.',
  sideEffect: 'read',
  schema: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' } }, required: ['lat', 'lon'] },
  async execute(args, { http }) {
    const result = await http<{ display_name?: string; address?: Record<string, unknown> }>({
      path: '/reverse',
      query: { lat: String(args.lat), lon: String(args.lon), format: 'json' },
    })
    return { label: result.display_name, address: result.address }
  },
})

export const mapsActions = [mapsGeocode, mapsReverseGeocode]
