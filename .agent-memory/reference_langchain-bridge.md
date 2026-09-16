---
title: LangChain bridge lives in adapters, not a new package
name: reference_langchain-bridge
description: adapterToLangChainModel (AdapterFactory -> BaseChatModel) ships as the @agentskit/adapters/langchain-bridge subpath with @langchain/core as an optional peer; do not split it into its own package
metadata:
  type: reference
---

**Fact:** `@agentskit/adapters/langchain-bridge` (`src/langchain-bridge.ts`)
wraps any `AdapterFactory` as a LangChain `BaseChatModel`. It is a separate
subpath, marked external in tsup, so the main entry never imports
`@langchain/core`, which is an optional peer dependency.

**Why:** The maintainer's constraint (2026-09): no new packages for bridges;
new capability lands as exports/subpaths inside existing packages. The
`langchain()`/`langgraph()` adapters in the main entry are structural (no
LangChain import); the bridge must extend the real `BaseChatModel` class, so
it needs the subpath isolation.

**How to apply:** Keep the bridge returning real `AIMessage`/`AIMessageChunk`
instances; `createAgent` middleware asserts `AIMessage.isInstance`. Keep
`profile.structuredOutput` off by default so `responseFormat` uses the tool
strategy. Adapters read the system prompt from a `role: 'system'` message,
not only `context.systemPrompt`, so the bridge emits both. Tests in
`packages/adapters/tests/langchain-bridge.test.ts` run a real `createAgent`
with tools + `wrapModelCall` + `responseFormat` over `mockAdapter`.
