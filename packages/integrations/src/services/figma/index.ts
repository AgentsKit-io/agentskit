import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { figmaActions } from './actions'

export const figmaIntegration = defineIntegration({
  name: 'figma',
  displayName: 'Figma',
  categories: ['productivity', 'design'],
  http: { baseUrl: 'https://api.figma.com/v1' },
  // Figma uses a custom header, not Authorization.
  auth: { kind: 'apiKey', header: 'x-figma-token', prefix: '', envHint: 'FIGMA_TOKEN' },
  actions: figmaActions,
})

registerIntegration(figmaIntegration)
