# ADR 0043 — Partition-bound RAG composition

- **Status**: Proposed (implementation authorized; evidence review remains external)
- **Date**: 2026-10-07

## Context

Shared vector stores need retrieval isolation without changing the stable
Retriever request contract in ADR 0004 or existing createRAG behavior.

## Decision

Add createPartitionedRAG in @agentskit/rag by composing createRAG with a
VectorMemory wrapper. Bind a non-empty partition at construction, stamp the
reserved _akPartition metadata key, and namespace chunk IDs using a JSON tuple.
Forward the core equality filter and independently reject foreign or missing
partition metadata. Namespace deletion IDs identically to insertion IDs.

Request one bounded candidate pool (topK times a configurable integer factor
from 1 to 16, default 4), cap local examination, and return at most topK matches.
Require a diagnostics callback on every search to report potentially reduced
recall, including when the store internally filters a bounded global pool.

## Consequences

No core contract, dependency, or vector backend changes. Existing RAG chunking,
embedding, score validation, source projection and replacement logic are reused.
Stores must preserve metadata and IDs faithfully; missing metadata fails closed.
Mislabelled metadata and untrusted writers require a separate authorization
boundary. Backend-internal candidate work is outside the wrapper bound. Full
recall requires an appropriate backend or physically separate stores.
