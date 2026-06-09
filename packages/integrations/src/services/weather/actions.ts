import { defineAction } from '../../contract'

export const weatherCurrent = defineAction({
  name: 'weather_current',
  description: 'Get current weather for a latitude/longitude or city name.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      lat: { type: 'number' },
      lon: { type: 'number' },
      city: { type: 'string' },
      units: { type: 'string', description: '"metric" | "imperial" | "standard"' },
    },
  },
  async execute(args, { http, config }) {
    const apiKey = (config as { apiKey: string }).apiKey
    const result = await http<{
      weather?: Array<{ description: string; main: string }>
      main?: { temp: number; humidity: number }
      wind?: { speed: number }
      name?: string
    }>({
      path: '/weather',
      query: {
        lat: args.lat !== undefined ? String(args.lat) : undefined,
        lon: args.lon !== undefined ? String(args.lon) : undefined,
        q: args.city !== undefined ? String(args.city) : undefined,
        units: args.units !== undefined ? String(args.units) : 'metric',
        appid: apiKey,
      },
    })
    return {
      location: result.name,
      summary: result.weather?.[0]?.description,
      condition: result.weather?.[0]?.main,
      temperature: result.main?.temp,
      humidity: result.main?.humidity,
      windSpeed: result.wind?.speed,
    }
  },
})

export const weatherActions = [weatherCurrent]
