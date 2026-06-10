import { defineIntegration } from '../../contract'
import { CONFIG_FIELDS } from '../../config-fields'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { pagerdutyActions } from './actions'
import { pagerdutyTriggers } from './triggers'

export const pagerdutyIntegration = defineIntegration({
  name: 'pagerduty',
  displayName: 'PagerDuty',
  categories: ['dev'],
  // Events API (routing key in body) + optional REST (Token header) — both
  // built per-call from ctx.config; no single auth/base URL.
  auth: { kind: 'none' },
  configFields: CONFIG_FIELDS.pagerduty,
  oauth: OAUTH_SPECS.pagerduty,
  actions: pagerdutyActions,
  triggers: pagerdutyTriggers,
  capabilities: { send: 'pagerduty_trigger' },
})

registerIntegration(pagerdutyIntegration)
