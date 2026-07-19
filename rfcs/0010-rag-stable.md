# RFC 0010 — `@agentskit/rag` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: @EmersonBraun
- **Related**: [ADR 0004](../docs/architecture/adrs/0004-retriever-contract.md), [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/rag` from beta to stable. Retriever, ingestion, chunking,
reranking, loader, cancellation, packaging, and portability hardening are
implemented, but this proposal does **not** promote the package or claim that
the time- and release-based gates have elapsed.

## Proposed stable commitment

At 1.0, the package commits to the exports recorded by its declaration snapshot
and to Retriever v1 behavior pinned by ADR 0004. In particular:

- `createRAG` remains store- and embedder-agnostic, with indexing outside the
  core Retriever contract;
- empty retrieval is successful, retrieval failures throw, stable document ids
  are preserved, and scored result sets contain only finite scores ordered
  descending;
- chunking remains synchronous and terminating, with custom splitting as the
  extension seam;
- reranked and hybrid retrievers remain transparent Retriever implementations,
  do not mutate caller data, validate malformed output, and return one
  consistent score scale per instance;
- BM25 and hybrid score calculations remain finite for supported options;
- loader and provider I/O accepts cancellation where the underlying transport
  supports it, fails with typed `RagError` values, and never reports incomplete
  pagination or total download failure as an empty successful corpus;
- tree loaders may return documented partial success after at least one eligible
  document loads;
- browser and React Native entries remain free of eager Node-only optional peer
  resolution, while the Node entry resolves the S3 SDK lazily.

New loaders, additive metadata, optional configuration, and new reranker
implementations are minor-compatible. Removing or renaming exports, changing
score/error semantics, mutating inputs, silently truncating a corpus, or making
chunking asynchronous requires the stable deprecation and major-version process.

## Evidence already implemented

- Contract and hardening suites cover R1–R11, score ordering, mutation
  isolation, invalid numeric inputs, embedding failure, BM25/hybrid edge cases,
  provider payload validation, cancellation, body-read failure, partial and
  total loader failure, pagination progress, Notion, OneDrive, and optional S3
  peer behavior.
- Package-manifest and Metro tests cover the root and `./chunker` exports,
  ESM/CJS/types targets, browser and React Native purity, and Node lazy peer
  resolution.
- The package clears its 95% line-coverage floor, strict TypeScript build, and
  compressed-size budget without adding a runtime dependency.
- Public API snapshots, packed consumers, supported Node/TypeScript
  compatibility, Doc Bridge, and README conformance are repository-wide gates.

## Gates that remain open

The hardening line includes an intentional beta behavior change from max-only to
min-max hybrid score normalization. Under ADR 0024, the 90-consecutive-day
window starts when this minor line is published. If it were published on
2026-07-16, the earliest possible completion would be 2026-10-14; a later
publication moves that date, and any later unplanned break resets the clock.

Promotion also requires:

1. releases from at least two distinct beta minor lines during the clean window;
2. an Accepted version of this dedicated RFC;
3. a complete `docs/stability/rag.json` evidence manifest accepted in review;
4. every direct internal runtime, optional, and peer dependency at stable;
5. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until all five are true, `@agentskit/rag` remains beta.

## Decision requested

Review whether ingestion, chunking, composition, scoring, loader failure, and
portable-entry commitments are narrow enough for a stable lifecycle. Acceptance
records the intended freeze; it does not waive ADR 0024 or authorize promotion
before the evidence and soak requirements are complete.
