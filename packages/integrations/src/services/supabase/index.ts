import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { supabaseActions } from './actions'

/**
 * Descriptor for the Supabase Management API integration.
 *
 * Docs: https://supabase.com/docs/reference/api/introduction
 * Auth: a personal access token (`SUPABASE_ACCESS_TOKEN`) sent as a Bearer
 * token. Create it at https://supabase.com/dashboard/account/tokens. The
 * Management API has no per-scope tokens, so use a dedicated token on an
 * account with access only to the projects the agent needs, and revoke it when
 * unused. Never use a project `service_role` key here. Actions are read-only.
 */
export const supabaseIntegration = defineIntegration({
  name: 'supabase',
  displayName: 'Supabase',
  categories: ['dev'],
  http: { baseUrl: 'https://api.supabase.com' },
  auth: { kind: 'apiKey', header: 'authorization', prefix: 'Bearer ', envHint: 'SUPABASE_ACCESS_TOKEN' },
  actions: supabaseActions,
})

registerIntegration(supabaseIntegration)
