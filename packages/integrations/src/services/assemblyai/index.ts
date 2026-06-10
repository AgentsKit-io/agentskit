import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { assemblyaiActions } from './actions'

export const assemblyaiIntegration = defineIntegration({
  name: 'assemblyai',
  displayName: 'AssemblyAI',
  categories: ['ai', 'media'],
  http: { baseUrl: 'https://api.assemblyai.com/v2' },
  // AssemblyAI sends the API key directly in the Authorization header (no scheme).
  auth: { kind: 'apiKey', header: 'authorization', prefix: '', envHint: 'ASSEMBLYAI_API_KEY' },
  actions: assemblyaiActions,
})

registerIntegration(assemblyaiIntegration)
