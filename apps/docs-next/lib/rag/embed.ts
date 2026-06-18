/**
 * Re-export of the shared embedder, now in `@agentskit/ask-core` (RFC-0007 F0).
 * Kept as a thin shim so existing `./embed` / `@/lib/rag/embed` imports across the
 * docs app keep working unchanged.
 */
export * from '@agentskit/ask-core'
