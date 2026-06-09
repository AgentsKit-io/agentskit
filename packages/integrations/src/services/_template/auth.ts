import type { AuthSpec } from '../../contract'

// Replace with the real auth shape. Common options:
//   { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'TEMPLATE_API_KEY' }
//   { kind: 'oauth2', authorizationUrl, tokenUrl, defaultScopes, usePkce }
export const templateAuth: AuthSpec = {
  kind: 'apiKey',
  header: 'authorization',
  prefix: 'Bearer ',
  envHint: 'TEMPLATE_API_KEY',
}
