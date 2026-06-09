import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { elevenlabsActions } from './actions'

export const elevenlabsIntegration = defineIntegration({
  name: 'elevenlabs',
  displayName: 'ElevenLabs',
  categories: ['ai', 'media'],
  http: { baseUrl: 'https://api.elevenlabs.io/v1' },
  // xi-api-key header built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: elevenlabsActions,
})

registerIntegration(elevenlabsIntegration)
