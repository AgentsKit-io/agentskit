---
'@agentskit/memory': minor
---

Add the optional `@agentskit/memory/postgres` subpath with BYO Drizzle/node-postgres ChatMemory, exported schema and migration SQL, tenant/session isolation, full message-part persistence, and opt-in turn-aware retention. Connection lifetime remains host-owned for Node pools and Workers clients.

Bounded retention cuts only at user turn boundaries and keeps the leading system prompt, so turns and tool call/result groups are never split and history is never emptied. Supports Drizzle 0.44 and 0.45 (from 0.45.3).
