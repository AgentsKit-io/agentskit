---
---

Add three reference bot templates wrapping `createChatTrigger`. Closes #779 (Slack), #780 (Discord), #781 (Teams).

Each template ships a thin `ChatSurfaceAdapter` (parse + verify + reply) over the provider's webhook / interactions endpoint plus a runnable Node HTTP server, README, and unit tests for the adapter — no provider SDK in dependencies (Bolt / discord.js / botbuilder), so `pnpm install` stays light. Production deployments swap the lean reply path for the official SDK to inherit retries, rate-limit handling, and pagination.

- **`apps/example-slack-bot`** — Slack Events API + `chat.postMessage`. Verifies Slack signing-secret + 300 s timestamp window. Normalizes `app_mention`, `message`, `message.subtype:file_share`, `reaction_added/removed` to the unified `ChatSurfaceEvent` union. URL-verification handshake handled inline before the trigger.
- **`apps/example-discord-bot`** — Discord Interactions HTTP endpoint. Verifies inbound Ed25519 signatures via `webcrypto.subtle`. Normalizes APPLICATION_COMMAND (type 2) and MESSAGE_COMPONENT (type 3) to mention events; PING (type 1) handled inline.
- **`apps/example-teams-bot`** — Microsoft Bot Framework activity payloads at `/api/messages`. Default `verifyToken` denies everything (deny-by-default JWT gate); deployers wire `botbuilder` `JwtTokenValidation` or any JWT lib. Normalizes `message`, `messageReaction`, and `conversationUpdate` to message / reply / file_upload / reaction / installation events.

All three share the same `createChatTrigger` contract (#782) — one observer taxonomy, one HITL surface, one filter shape across surfaces.
