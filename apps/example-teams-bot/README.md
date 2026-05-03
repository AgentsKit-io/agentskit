# @agentskit/example-teams-bot

Reference Microsoft Teams bot wrapping `createChatTrigger` from `@agentskit/runtime`. Closes [#781](https://github.com/AgentsKit-io/agentskit/issues/781).

Driver-light: consumes Bot Framework activity payloads at `/api/messages` and verifies the inbound JWT via an injected `verifyToken` callback. No `botbuilder` / `microsoft-graph-client` dependency in this template — wire `botbuilder`'s `JwtTokenValidation.authenticateRequest` (or any JWT lib against Microsoft's OpenID config) in production.

## Setup

1. Register a bot in **Azure Bot Service**. Create an Azure AD app (single-tenant, multi-tenant, or managed identity — your choice). Copy the App ID + secret (or certificate / managed identity).
2. Set the messaging endpoint to `https://<your-host>/api/messages`.
3. Sideload the Teams app manifest into a Teams tenant.

```bash
export TEAMS_APP_ID=...
export TEAMS_APP_SECRET=...
# Skip JWT validation only for local development:
export TEAMS_DISABLE_AUTH=1
pnpm --filter @agentskit/example-teams-bot dev
```

`src/index.ts` ships a stub `verifyToken` that **returns false unless `TEAMS_DISABLE_AUTH=1`** so you can't accidentally deploy without JWT validation.

## What it normalizes

| Bot Framework activity | Normalized type |
|---|---|
| `message` | `message` (or `reply` when `replyToId` set, `file_upload` when attachment present) |
| `messageReaction` | `reaction` |
| `conversationUpdate` (membersAdded) | `installation: 'installed'` |
| `conversationUpdate` (membersRemoved) | `installation: 'uninstalled'` |
| `typing` / `invoke` / `endOfConversation` / unknown | `null` (200 ignored) |

## Replies

`teamsAdapter` requires an injected `TeamsServiceClient`. Wrap `botbuilder`'s `BotFrameworkAdapter.createConnectorClient(serviceUrl).conversations.replyToActivity(...)` in production. The bundled stub logs to console.

## Auth modes

The injected `verifyToken` callback receives `(token, request)` so you can plug:
- **App ID + secret** — standard `botbuilder` `JwtTokenValidation`
- **Certificate-based** — Azure AD certificate credential
- **Managed identity** — Azure-hosted identity, no shared secrets
