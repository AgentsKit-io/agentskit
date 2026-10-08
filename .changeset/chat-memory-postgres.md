---
'@agentskit/memory': minor
---

Add the optional `@agentskit/memory/postgres` subpath with BYO Drizzle/node-postgres ChatMemory, exported schema and migration SQL, tenant/session isolation, full message-part persistence, and opt-in newest-message retention. Connection lifetime remains host-owned for Node pools and Workers clients.

Bounded retention discards leading tool results rather than preserving orphaned responses. Supports Drizzle 0.44 and 0.45 (from 0.45.3).
