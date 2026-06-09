---
"@agentskit/memory": patch
---

Fix flaky empty-result reads from `fileVectorMemory` (vectra backend). `upsert`
now batches all inserts into a single atomic vectra `beginUpdate`/`endUpdate`
block instead of writing the on-disk index once per document. The per-doc writes
left intermediate partial index states that a subsequent `search` could read
mid-flush on slow disks, intermittently returning zero results in CI.
