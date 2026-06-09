import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { whisperActions } from './actions'

export const whisperIntegration = defineIntegration({
  name: 'whisper',
  displayName: 'OpenAI Whisper',
  categories: ['ai', 'media'],
  http: { baseUrl: 'https://api.openai.com/v1' },
  // Bearer auth + multipart upload built per-call from ctx.config.
  auth: { kind: 'none' },
  actions: whisperActions,
})

registerIntegration(whisperIntegration)
