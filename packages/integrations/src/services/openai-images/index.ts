import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { openaiImagesActions } from './actions'

export const openaiImagesIntegration = defineIntegration({
  name: 'openai-images',
  displayName: 'OpenAI Images',
  categories: ['ai', 'media'],
  http: { baseUrl: 'https://api.openai.com/v1' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'OPENAI_API_KEY' },
  actions: openaiImagesActions,
})

registerIntegration(openaiImagesIntegration)
