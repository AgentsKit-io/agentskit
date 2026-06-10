import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { elevenlabsActions } from './actions'

export const elevenlabsIntegration = defineIntegration({
  name: 'elevenlabs',
  displayName: 'ElevenLabs',
  categories: ['ai', 'media'],
  http: { baseUrl: 'https://api.elevenlabs.io/v1' },
  // xi-api-key header built per-call from ctx.config.
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.elevenlabs,
  actions: elevenlabsActions,
})

registerIntegration(elevenlabsIntegration)
