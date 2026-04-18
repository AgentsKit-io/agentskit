---
"@agentskit/cli": minor
---

RAG scaffolding (Phase 6 of ARCHITECTURE.md). New `agentskit rag index` subcommand chunks + embeds every file matched by `config.rag.sources` into a file-backed vector store. Includes a minimal OpenAI-compatible embedder (`createOpenAiEmbedder`) that works against OpenAI, OpenRouter, Azure, and local servers speaking the same shape. `buildRagFromConfig` is exported for direct embedding in host apps. Auto-retrieval in chat is a follow-up.
