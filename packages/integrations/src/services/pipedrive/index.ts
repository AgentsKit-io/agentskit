import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { pipedriveActions } from './actions'

export const pipedriveIntegration = defineIntegration({
  name: 'pipedrive',
  displayName: 'Pipedrive',
  categories: ['crm'],
  // Default API base; a company-specific base URL can be supplied via projection
  // config. api_token is sent as a query param (from ctx.config).
  http: { baseUrl: 'https://api.pipedrive.com/v1' },
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.pipedrive,
  actions: pipedriveActions,
  capabilities: { send: 'pipedrive_create_deal' },
})

registerIntegration(pipedriveIntegration)
