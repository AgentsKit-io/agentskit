---
'@agentskit/memory': patch
---

`createKvMemoryFromConfigAuto` now surfaces backend-specific driver-missing codes
(`AK_MEMORY_SQLITE_DRIVER_MISSING` / `AK_MEMORY_REDIS_DRIVER_MISSING`) instead of
the generic `AK_MEMORY_PEER_MISSING`, matching the consuming host's error contract.
