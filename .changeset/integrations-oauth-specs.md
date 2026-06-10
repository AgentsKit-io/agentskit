---
'@agentskit/integrations': minor
---

Add OAuth2 **provider specs** to the catalog — a new optional `Integration.oauth` field (`OAuth2ProviderSpec`: authorize/token URLs, default scopes, PKCE, extra authorize params) populated for every OAuth-capable service (slack, github, linear, notion, jira, confluence, discord, sentry, pagerduty, stripe, dropbox, salesforce, gmail/google-calendar/google-drive via the shared Google spec). Pure declarative data — the host owns the flow runner, token vault, and app client secrets. This makes the catalog the open OAuth provider registry, so an agent can drive an OAuth authorization-code flow without the OS.
