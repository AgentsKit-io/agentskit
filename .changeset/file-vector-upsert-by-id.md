---
'@agentskit/memory': patch
---

`fileVectorMemory.store` now upserts by id (ADR 0003 VM1): storing a document whose id already exists replaces it instead of adding a duplicate.
