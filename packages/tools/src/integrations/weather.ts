import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface WeatherConfig extends HttpToolOptions {
  /** OpenWeatherMap API key. */
  apiKey: string
}

function opts(config: WeatherConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.openweathermap.org/data/2.5',
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
    headers: config.headers,
  }
}

export function weatherCurrent(config: WeatherConfig) {
  const base = opts(config)
  return defineTool({
    name: 'weather_current',
    description: 'Get current weather for a latitude/longitude or city name.',
    schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        city: { type: 'string' },
        units: { type: 'string', description: '"metric" | "imperial" | "standard"' },
      },
    } as const,
    async execute({ lat, lon, city, units }) {
      const result = await httpJson<{
        weather?: Array<{ description: string; main: string }>
        main?: { temp: number; humidity: number }
        wind?: { speed: number }
        name?: string
      }>(base, {
        path: '/weather',
        query: {
          lat: lat !== undefined ? String(lat) : undefined,
          lon: lon !== undefined ? String(lon) : undefined,
          q: city !== undefined ? String(city) : undefined,
          units: units !== undefined ? String(units) : 'metric',
          appid: config.apiKey,
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
}

export function weather(config: WeatherConfig) {
  return [weatherCurrent(config)]
}
