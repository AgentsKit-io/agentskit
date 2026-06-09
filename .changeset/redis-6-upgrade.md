---
"@agentskit/memory": patch
---

Upgrade the optional `redis` peer to v6. node-redis v6 renamed the graceful
client shutdown from `client.disconnect()` (v5) to `client.close()`; the Redis
client adapter now calls `client.close()`. v6 also defaults to RESP3, which is
transparent for the simple string commands (`get`/`set`/`del`/`keys`/`sendCommand`)
this adapter uses.
