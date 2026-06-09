---
"@agentskit/memory": patch
---

Fix flaky empty-result reads from `fileVectorMemory` (vectra backend). `upsert`
now batches all inserts into a single atomic vectra `beginUpdate`/`endUpdate`
block instead of writing the on-disk index once per document. The per-doc writes
left intermediate partial index states that a subsequent `search` could read
mid-flush on slow disks, intermittently returning zero results in CI.

Also adapts to vectra 0.15, which inserts a BM25 `query` string argument into
`queryItems(vector, query, topK)`. `search` now passes an empty query for pure
vector search; without this the bumped vectra returned zero results.
