---
'@agentskit/rag': minor
---

Harden retrieval, chunking, reranking, and document-loading boundaries ahead of
the future stable freeze.

Chunking and numeric options now terminate safely for invalid inputs. RAG and
composite retrievers enforce the Retriever v1 score contract without fabricating
scores, BM25 and hybrid scoring remain finite for adversarial parameters, and
rerankers validate provider and custom output.

Document loaders now expose additive `AbortSignal` support, wrap request and body
failures in typed `RagError` values, distinguish partial success from total
download failure, reject incomplete pagination, and follow Notion and OneDrive
pagination. Voyage and Jina rerankers also accept an optional signal.

Hybrid blending now uses min-max candidate normalization and normalized relative
weights. This can change blended ranking for consumers whose vector scores are
not zero-based; review ranking thresholds and golden retrieval fixtures when
upgrading.

This is not a stable promotion. `@agentskit/rag` remains beta, and the 90-day
graduation clock begins only after this minor line is published.
