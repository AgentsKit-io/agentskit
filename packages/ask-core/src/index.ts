/**
 * @agentskit/ask-core — shared engine for the AgentsKit Ask backend (RFC-0007).
 *
 * The corpus-agnostic pieces reused by the docs site and the central Railway
 * backend. F0 extracts the keystone first: the shared ONNX embedder (one model,
 * loaded once, shared across every corpus). Guards, the streaming protocol, and
 * `createAskHandler` follow in later slices.
 */
export { embed, embedBatch, EMBED_DIM, EMBED_MODEL } from './embed'
