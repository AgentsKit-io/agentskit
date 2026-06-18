/**
 * @agentskit/ask-core — shared engine for the AgentsKit Ask backend (RFC-0007).
 *
 * The default entry is **client-safe**: the streaming wire protocol + the
 * generative-UI tool definitions, with NO Node-only dependencies. The ONNX
 * embedder is a separate Node-only entry, `@agentskit/ask-core/embed`, so a
 * browser widget importing the protocol never pulls `@huggingface/transformers`.
 */
export * from './protocol'
