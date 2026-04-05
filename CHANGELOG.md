# Changelog

## 0.3.0 (2026-04-04)

### Breaking Changes

- `ToolDefinition.schema` type changed from `unknown` to `JSONSchema7` (from `@types/json-schema`). Existing plain objects that match JSON Schema shape will continue to work.
- `ToolDefinition.execute` return type widened to support `AsyncIterable<unknown>` for streaming tool output.

### New Type Contracts

- **`SkillDefinition`** — behavioral prompt contract with `systemPrompt`, `examples`, `delegates`, `tools`, and `onActivate` hook that returns tools to register.
- **`VectorMemory`** — pure vector storage contract (`store`, `search`, `delete`) accepting `number[]` embeddings. Separate from `ChatMemory`.
- **`VectorDocument`** — document with `id`, `content`, `embedding`, and optional `metadata`.
- **`AgentEvent`** — union type for lifecycle events: `llm:start`, `llm:first-token`, `llm:end`, `tool:start`, `tool:end`, `memory:load`, `memory:save`, `agent:step`, `error`.
- **`Observer`** — simple `{ name, on(event) }` contract for extensible logging/tracing.
- **`EvalTestCase`**, **`EvalResult`**, **`EvalSuite`** — minimal evaluation contracts.

### New Features

- `ToolDefinition` now supports optional `init()`/`dispose()` lifecycle methods for stateful tools.
- `ToolDefinition` now supports `tags` and `category` for tool discovery.
- `ChatConfig` accepts `observers` for event-based observability.
- **ChatController emits `AgentEvent`s** at all lifecycle points (LLM start/end, tool start/end, memory load/save, errors).

### Shared Primitives (new exports)

- `generateId(prefix)` — prefixed unique ID generation (`msg-`, `tool-`, `step-`, etc.).
- `createEventEmitter()` — lightweight observer pattern, error-isolated, async-safe.
- `buildMessage({ role, content, status?, metadata? })` — standardized message construction.
- `executeToolCall(tool, args, context, onPartialResult?)` — unified tool execution with `AsyncIterable` support and incremental result callbacks.
- `consumeStream(source, handlers)` — callback-based stream consumption decoupled from any state model.

### Internal

- ChatController refactored to use shared primitives (no behavior change for consumers).
- Core remains zero external runtime dependencies. Bundle: 3.8 KB gzipped (limit: 10 KB).

## 0.2.0 (2026-04-04)

### Breaking Changes

- Restructured from single package to pnpm monorepo with Turborepo.
- Package scope renamed from `@agentkit` to `@agentskit`.
- Ecosystem renamed from AgentKit to AgentsKit.

### New Packages

- `@agentskit/core` — portable runtime with ChatController, memory, and retrieval.
- `@agentskit/react` — React hooks and headless UI components.
- `@agentskit/ink` — Ink terminal components.
- `@agentskit/adapters` — LLM provider adapters (Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, LangChain, Vercel AI, generic).
- `@agentskit/cli` — CLI with `chat` and `init` commands.

## 0.1.0

Initial release.
