import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { airtableActions } from './actions'

export const airtableIntegration = defineIntegration({
  name: 'airtable',
  displayName: 'Airtable',
  categories: ['productivity'],
  // Base URL is per-base (https://api.airtable.com/v0/<baseId>/) — supplied by
  // the caller via projection config.
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'AIRTABLE_API_KEY' },
  actions: airtableActions,
  capabilities: { send: 'airtable_create_record' },
})

registerIntegration(airtableIntegration)
