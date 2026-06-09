import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { weatherActions } from './actions'

export const weatherIntegration = defineIntegration({
  name: 'weather',
  displayName: 'Weather (OpenWeatherMap)',
  categories: ['web'],
  http: { baseUrl: 'https://api.openweathermap.org/data/2.5' },
  // API key is sent as the `appid` query param (from ctx.config), not a header.
  auth: { kind: 'none' },
  actions: weatherActions,
})

registerIntegration(weatherIntegration)
