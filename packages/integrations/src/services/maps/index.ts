import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { mapsActions } from './actions'

export const mapsIntegration = defineIntegration({
  name: 'maps',
  displayName: 'Maps (OpenStreetMap / Nominatim)',
  categories: ['web'],
  http: { baseUrl: 'https://nominatim.openstreetmap.org', headers: { 'user-agent': 'agentskit-maps/1.0' } },
  auth: { kind: 'none' },
  actions: mapsActions,
})

registerIntegration(mapsIntegration)
