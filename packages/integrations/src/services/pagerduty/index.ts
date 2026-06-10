import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { OAUTH_SPECS } from '../../oauth-specs'
import { pagerdutyActions } from './actions'

export const pagerdutyIntegration = defineIntegration({
  name: 'pagerduty',
  displayName: 'PagerDuty',
  categories: ['dev'],
  // Events API (routing key in body) + optional REST (Token header) — both
  // built per-call from ctx.config; no single auth/base URL.
  auth: { kind: 'none' },
  oauth: OAUTH_SPECS.pagerduty,
  actions: pagerdutyActions,
  capabilities: { send: 'pagerduty_trigger' },
})

registerIntegration(pagerdutyIntegration)
