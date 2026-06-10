import type { OAuth2ProviderSpec } from './contract'

/**
 * OAuth2 provider specs for catalog services that support an authorization-code
 * flow. Pure data (endpoints/scopes/PKCE) — the host owns the flow runner,
 * token vault, and app client secrets. Attached to each descriptor's `oauth`
 * field so the catalog is the open OAuth provider registry.
 */
export const OAUTH_SPECS = {
  slack: { authorizationUrl: 'https://slack.com/oauth/v2/authorize', tokenUrl: 'https://slack.com/api/oauth.v2.access', defaultScopes: ['app_mentions:read', 'chat:write', 'channels:history'], usePkce: false },
  github: { authorizationUrl: 'https://github.com/login/oauth/authorize', tokenUrl: 'https://github.com/login/oauth/access_token', defaultScopes: ['repo', 'read:user', 'workflow'], usePkce: false },
  linear: { authorizationUrl: 'https://linear.app/oauth/authorize', tokenUrl: 'https://api.linear.app/oauth/token', defaultScopes: ['read', 'write'], usePkce: false },
  google: { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', defaultScopes: ['openid', 'email', 'profile'], usePkce: true },
  notion: { authorizationUrl: 'https://api.notion.com/v1/oauth/authorize', tokenUrl: 'https://api.notion.com/v1/oauth/token', defaultScopes: [], usePkce: false },
  jira: { authorizationUrl: 'https://auth.atlassian.com/authorize', tokenUrl: 'https://auth.atlassian.com/oauth/token', defaultScopes: ['read:jira-user', 'read:jira-work', 'write:jira-work', 'offline_access'], usePkce: true, extraAuthParams: { audience: 'api.atlassian.com', prompt: 'consent' } },
  confluence: { authorizationUrl: 'https://auth.atlassian.com/authorize', tokenUrl: 'https://auth.atlassian.com/oauth/token', defaultScopes: ['read:confluence-content.all', 'read:confluence-user', 'offline_access'], usePkce: true, extraAuthParams: { audience: 'api.atlassian.com', prompt: 'consent' } },
  discord: { authorizationUrl: 'https://discord.com/api/oauth2/authorize', tokenUrl: 'https://discord.com/api/oauth2/token', defaultScopes: ['identify', 'guilds'], usePkce: false },
  sentry: { authorizationUrl: 'https://sentry.io/oauth/authorize/', tokenUrl: 'https://sentry.io/oauth/token/', defaultScopes: ['org:read', 'project:read', 'event:read'], usePkce: false },
  pagerduty: { authorizationUrl: 'https://identity.pagerduty.com/oauth/authorize', tokenUrl: 'https://identity.pagerduty.com/oauth/token', defaultScopes: ['read', 'write'], usePkce: true },
  stripe: { authorizationUrl: 'https://connect.stripe.com/oauth/authorize', tokenUrl: 'https://connect.stripe.com/oauth/token', defaultScopes: ['read_write'], usePkce: false },
  dropbox: { authorizationUrl: 'https://www.dropbox.com/oauth2/authorize', tokenUrl: 'https://api.dropboxapi.com/oauth2/token', defaultScopes: ['files.content.read', 'files.metadata.read'], usePkce: false, extraAuthParams: { token_access_type: 'offline' } },
  salesforce: { authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize', tokenUrl: 'https://login.salesforce.com/services/oauth2/token', defaultScopes: ['api', 'refresh_token'], usePkce: true },
} as const satisfies Record<string, OAuth2ProviderSpec>
