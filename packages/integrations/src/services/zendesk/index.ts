import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { zendeskActions } from './actions'

/** Descriptor for the Zendesk Support service integration. */
export const zendeskIntegration = defineIntegration({
  name: 'zendesk',
  displayName: 'Zendesk',
  categories: ['support', 'crm'],
  // Tenant-specific host + Basic auth (email/token:apiToken) built per-call
  // from ctx.config. Docs: https://developer.zendesk.com/api-reference/
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.zendesk,
  actions: zendeskActions,
})

registerIntegration(zendeskIntegration)
