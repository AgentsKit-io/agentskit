import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { azureOpenaiActions } from './actions'

export const azureOpenaiIntegration = defineIntegration({
  name: 'azure-openai',
  displayName: 'Azure OpenAI',
  categories: ['ai'],
  // Per-resource endpoint (https://<resource>.openai.azure.com) is supplied by
  // the caller via projection config baseUrl; deployment + api-version via config.
  auth: { kind: 'apiKey', header: 'api-key', prefix: '', envHint: 'AZURE_OPENAI_API_KEY' },
  actions: azureOpenaiActions,
})

registerIntegration(azureOpenaiIntegration)
