import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { freshdeskActions } from './actions'

/** Descriptor for the Freshdesk service integration. */
export const freshdeskIntegration = defineIntegration({
  name: 'freshdesk',
  displayName: 'Freshdesk',
  categories: ['support'],
  // Tenant-specific host + Basic auth (apiKey:X) built per-call
  // from ctx.config. Docs: https://developers.freshdesk.com/api-reference/
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.freshdesk,
  actions: freshdeskActions,
})

registerIntegration(freshdeskIntegration)
