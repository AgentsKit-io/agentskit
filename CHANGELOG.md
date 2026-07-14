# Changelog

This changelog tells the story of AgentsKit.js — what changed, why it matters, and where the project is headed. Each entry follows a consistent structure:

- **Narrative summary** — the theme of the release in plain language
- **Changes grouped by category** — Added, Changed, Fixed, Breaking
- **What's next** — a short pointer to upcoming work (latest release only)

Entries are versioned by semver and dated by release. Future monthly entries should follow the same pattern: lead with the story, then back it up with specifics.

---

## Unreleased

### Added

- **Human-approved content atom pipeline** (`docs/ecosystem/content-pipeline/`, `pnpm content-pipeline:run`) with deterministic local roles mapped honestly to Registry contracts and offline claim verification for issue #1206. Publishing stays content-digest-bound, evidence-gated, and human-approved.

## v1.0.0 — April 2026 · "Public Launch"

April 2026 was the moment AgentsKit.js stepped out of early access and into the open. The v1.0.0 release consolidated the entire ecosystem under a single stable foundation — hardened contracts, a rebuilt documentation site, a full contribution pathway, and production-ready CI. The name was also officially registered: **AgentsKit.js**, clearly distinct from Inngest AgentKit.

### Added

- **`@agentskit/core` declared stable at v1.0.0** — the zero-dependency foundation is now under stability guarantees.
- **Edit + regenerate** for `useChat` and the chat controller — users can now go back and rephrase any message.
- **`costGuard` observer** in `@agentskit/observability` — enforces a per-run or per-session token/cost budget, aborting when the limit is hit.
- **Zero-config adapter capabilities** + `simulateStream` utility in `@agentskit/adapters` — adapters now auto-detect model capabilities without manual configuration.
- **Mock, recording, and replay adapters** in `@agentskit/adapters` — drop-in test doubles for deterministic unit and integration tests.
- **Auto-retry with exponential backoff** in `@agentskit/adapters` — transient provider errors are handled transparently.
- **`agentskit tunnel` command** — expose a local agent endpoint to the internet for webhook testing.
- **`agentskit dev` command** — hot-reload mode for agent development; restarts the runtime on file change.
- **`agentskit doctor` command** — diagnostics that inspect the local environment and report missing configuration.
- **`agentskit init` revamped** — interactive project generator now supports four templates (React, Ink, Runtime, and CLI).
- **Fumadocs-based documentation site** — 44 pages across 12 sections, replacing the Docusaurus prototype.
- **Per-page dynamic OG images** with section accent colours.
- **Full SEO pass** — robots.txt, sitemap, structured data, canonical URLs.
- **Playwright e2e coverage** for all four example apps.
- **Per-package coverage thresholds** enforced in CI via Vitest.
- **Bundle size budget** enforced in CI via `size-limit`.
- **ADRs 0001–0006** — architectural decision records for Adapter, Tool, Memory, Retriever, Skill, and Runtime contracts.
- **Stability tiers declared** for every package (stable / beta / experimental).
- **`CONVENTIONS.md`** added to every package.
- **Discord invite and Product Hunt badge** added to the project README.

### Changed

- Package READMEs polished and npm keywords expanded across the board; all links migrated to `www.agentskit.io`.
- Documentation contributor guide rewritten to reflect the monorepo structure.
- Brand tokens (`ak-*` CSS custom properties) are now theme-aware so light mode works correctly.

### Fixed

- **`@agentskit/core` browser compatibility** restored — Node-only code (`crypto`, `fs`) removed from the core bundle.
- **`@agentskit/ink`** test harness restored after the Ink 6→7 upgrade.
- Ink dependency bumped to `7.0.0`.
- CLI starter templates now include correct `@types/react` and `@types/react-dom` dev dependencies.
- Hero demo chat body fixed to a consistent height with auto-scroll on new content.
- Mobile landing page overflow and install command display corrected.
- CI npm publish workflow authenticated correctly via `NODE_AUTH_TOKEN`.
- PostHog replaced with Vercel Analytics in the documentation site; `@vercel/speed-insights` added.

### What's Next

The ecosystem is open. The immediate priorities are `@agentskit/memory` (vector backends), `@agentskit/rag` (plug-and-play retrieval), `@agentskit/tools` (marketplace of reusable tools), and `@agentskit/sandbox` (secure code execution via E2B). Community contributions are welcome — start with the good-first-issues on GitHub or join the Discord.

---

## v0.4.0 — April 5, 2026 · "The Runtime"

With the core type system and event model solid, attention shifted to autonomy. v0.4.0 introduced `@agentskit/runtime` — a standalone execution engine that runs full ReAct loops without any UI layer. This is the piece that turns AgentsKit from a chat library into a genuine agent framework: give it a task, tools, and memory, and it drives itself to a result.

### Added

- **New package: `@agentskit/runtime`**
  - `createRuntime(config)` factory accepting `adapter`, `tools`, `memory`, and `observers`.
  - `runtime.run(task, options?)` executes an autonomous ReAct loop until the task is complete or a step limit is reached.
  - Tool results are injected as `role: 'tool'` messages and automatically re-sent to the adapter — the LLM decides its next action.
  - Lazy tool lifecycle: `init()` is called before first use; `dispose()` is called after the run completes.
  - Skill activation via `onActivate()` — activating a skill merges its tools into the runtime (last-registered wins on name collision).
  - Tool errors are injected as results rather than thrown — the LLM can decide how to recover.
  - `AbortSignal` support for per-run cancellation.
  - Memory is saved at the end of each run (no automatic hydration at start — callers control that).
  - Returns a structured `RunResult`: `{ content, messages, steps, toolCalls, durationMs }`.
  - 19 tests covering all runtime behaviours.

---

## v0.3.0 — April 4, 2026 · "Contracts and Primitives"

Before building higher-level packages, the team paused to get the contracts right. v0.3.0 is a foundational release: it codified every major abstraction (skills, vector memory, evaluation, observability) as first-class TypeScript types, and extracted the shared primitives that all packages will rely on. The result is a codebase where every future package knows exactly what it must implement and what it can reuse.

### Added

- **`SkillDefinition`** — behavioural prompt contract with `systemPrompt`, `examples`, `delegates`, `tools`, and an `onActivate` hook that returns tools to register at activation time.
- **`VectorMemory`** — pure vector storage contract (`store`, `search`, `delete`) accepting `number[]` embeddings, intentionally separate from `ChatMemory`.
- **`VectorDocument`** — document type with `id`, `content`, `embedding`, and optional `metadata`.
- **`AgentEvent`** — union type for all lifecycle events: `llm:start`, `llm:first-token`, `llm:end`, `tool:start`, `tool:end`, `memory:load`, `memory:save`, `agent:step`, `error`.
- **`Observer`** — simple `{ name, on(event) }` contract for extensible logging and tracing.
- **`EvalTestCase`**, **`EvalResult`**, **`EvalSuite`** — minimal evaluation contracts.
- **Shared primitives** (new named exports from `@agentskit/core`):
  - `generateId(prefix)` — prefixed unique ID generation (`msg-`, `tool-`, `step-`, etc.).
  - `createEventEmitter()` — lightweight observer pattern, error-isolated and async-safe.
  - `buildMessage({ role, content, status?, metadata? })` — standardised message construction.
  - `executeToolCall(tool, args, context, onPartialResult?)` — unified tool execution with `AsyncIterable` support and incremental result callbacks.
  - `consumeStream(source, handlers)` — callback-based stream consumption decoupled from any state model.
- **`ToolDefinition`** now supports optional `init()` / `dispose()` lifecycle methods for stateful tools.
- **`ToolDefinition`** now supports `tags` and `category` for tool discovery and filtering.
- **`ChatConfig`** accepts an `observers` array for event-based observability.
- **`ChatController` emits `AgentEvent`s** at all lifecycle points.

### Breaking Changes

- **`ToolDefinition.schema`** type changed from `unknown` to `JSONSchema7` (from `@types/json-schema`). Existing plain objects that conform to JSON Schema shape will continue to work without changes.
- **`ToolDefinition.execute`** return type widened to `AsyncIterable<unknown>` to support streaming tool output. Existing tools that return plain values or `Promise` are still valid.

### Internal

- `ChatController` refactored to use the new shared primitives — no behaviour change for consumers.
- Core bundle: **3.8 KB gzipped** (hard limit: 10 KB). Zero external runtime dependencies maintained.

---

## v0.2.0 — April 4, 2026 · "The Monorepo"

The single-package prototype proved the concept. v0.2.0 rebuilt everything from the ground up as a proper monorepo, introduced a scope rename, and laid out the full package graph that the ecosystem will grow into. This is the structural foundation everything else stands on.

### Added

- **`@agentskit/core`** — portable runtime with `ChatController`, memory, and retrieval. Zero dependencies.
- **`@agentskit/react`** — React hooks (`useChat`) and headless UI components (`ChatContainer`, `Message`, `InputBar`, `ToolCallView`, `ThinkingIndicator`).
- **`@agentskit/ink`** — Ink terminal components with keyboard navigation and ANSI theming.
- **`@agentskit/adapters`** — provider adapters for Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, LangChain, Vercel AI SDK, and a generic `ReadableStream` adapter.
- **`@agentskit/cli`** — CLI with `chat` and `init` commands.

### Breaking Changes

- **Monorepo restructure** — the codebase moved from a single package to a pnpm monorepo with Turborepo.
- **Package scope renamed** from `@agentkit/*` to `@agentskit/*`. Update all imports and `package.json` references.
- **Ecosystem renamed** from AgentKit to AgentsKit.

---

## v0.1.0 — April 2, 2026 · "Day One"

The first commit. A single package called `react-arrow` proved that the core ideas were worth pursuing: a streaming chat hook, a headless component set, and provider adapters behind a clean contract. This version was never published to npm — it existed to validate the architecture before the monorepo rewrite in v0.2.0.

### Added

- Core type definitions: `Message`, `StreamSource`, `ChatConfig`.
- `useStream` hook with streaming tests.
- `useReactive` hook with proxy-based state and `useSyncExternalStore`.
- `useChat` hook with `send`, `stop`, `retry`, and streaming support.
- Adapter system with `createAdapter` factory, generic adapter, and initial Anthropic, OpenAI, and Vercel AI adapters.
- Headless components: `ChatContainer`, `Message`, `InputBar`.
- Additional components: `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`.
- Default theme via CSS custom properties with light/dark mode support.
- Docusaurus documentation site (initial scaffold).
- GitHub Actions for CI and docs deployment.
- Open source governance files: `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`.
- GitHub issue and PR templates.
