---
'@agentskit/memory': minor
---

feat(memory): three new vector stores:

- `weaviateVectorStore` (#457) — Weaviate cluster: REST batch insert + GraphQL `nearVector` search.
- `milvusVectorStore` (#458) — Milvus / Zilliz Cloud v2 REST API with Bearer auth.
- `mongoAtlasVectorStore` (#460) — MongoDB Atlas Vector Search via `$vectorSearch` aggregation. Caller injects a Collection-shaped client; the `mongodb` driver stays as an external concern.

All three implement `VectorMemory` and inherit the v1 `VectorFilter` contract.
