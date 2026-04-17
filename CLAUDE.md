# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is AgentsKit

AgentsKit is the most complete agent toolkit for the JavaScript ecosystem. It provides everything needed to build AI chat interfaces, standalone agents, tools, skills, memory, RAG, and observability — across React, terminal, and CLI. The entire ecosystem aims to become the foundation for the agent era: easy integration with other libraries, seamless agent creation, and long-term maintainability.

## Vital Rules

1. **`@agentskit/core` must remain extremely lightweight**: only types, events, contracts, and minimal base logic. Zero external dependencies. Must stay under 10 KB gzipped.
2. **Every package must be Plug and Play**: simple imports, minimal configuration, clear contracts. Every package is independently installable.
3. **Interoperability is mandatory**: any combination of packages must work together seamlessly.

## Commands

```bash
pnpm install                          # install all deps
pnpm build                            # build all packages (turborepo)
pnpm test                             # run all tests (vitest via turborepo)
pnpm lint                             # type-check all packages (tsc --noEmit)
pnpm dev                              # watch mode for all packages

# Single package
pnpm --filter @agentskit/core test     # test one package
pnpm --filter @agentskit/react build   # build one package
pnpm --filter @agentskit/adapters test -- --watch  # watch mode

# Apps
pnpm --filter @agentskit/docs start    # docusaurus dev server
pnpm --filter @agentskit/example-react dev  # vite dev server
pnpm --filter @agentskit/example-ink dev    # tsx runner
```

## Package Dependency Graph

```
@agentskit/core            ← pure foundation, zero deps
  ├── @agentskit/adapters  ← provider adapters (OpenAI, Anthropic, Gemini, etc.)
  ├── @agentskit/react     ← React hooks + UI components
  ├── @agentskit/ink       ← Ink terminal components
  ├── @agentskit/cli       ← CLI (chat, init, run)
  ├── @agentskit/runtime   ← standalone agent runtime (no UI)
  ├── @agentskit/tools     ← reusable executable tools
  ├── @agentskit/skills    ← ready-made skills (prompts + behavior)
  ├── @agentskit/memory    ← persistent and vector memory
  ├── @agentskit/rag       ← plug-and-play RAG
  ├── @agentskit/sandbox   ← secure code execution (E2B / WebContainer)
  ├── @agentskit/observability ← logging, tracing (LangSmith, OpenTelemetry)
  └── @agentskit/eval      ← agent evaluation and benchmarking
```

## Architecture by Package

### @agentskit/core
Pure core with zero dependencies. Contains TypeScript types, event definitions, and contracts (Adapter, Tool, Skill, Memory, Retriever, etc.). Base primitives: `createChatController`, event emitter, message handling, streaming model. Serves as the stable foundation all other packages depend on.

### @agentskit/react
Browser UI layer. Provides React hooks (`useChat`) and headless components (`ChatContainer`, `Message`, `InputBar`, `ToolCallView`, `ThinkingIndicator`). Full support for streaming, tool calls, memory, and skills. Uses `data-ak-*` attributes for AI-generated UIs. Theme support via CSS variables at `@agentskit/react/theme`.

### @agentskit/ink
Terminal UI layer using Ink. Equivalent components to React: `ChatContainer`, `Message`, `InputBar`, `ToolCallView`, etc. Keyboard navigation, auto-scroll, ANSI theming. Reuses 100% of `@agentskit/core` logic. Default file-based memory. Goal: identical developer experience as the React version.

### @agentskit/cli
Command-line interface. `agentskit chat` launches interactive Ink-based chat. `agentskit init` is an interactive project generator (React or Ink templates). `agentskit run` executes runtime agents from terminal. Supports flags for provider, model, system prompt, memory, etc. Includes create-agentskit functionality.

### @agentskit/adapters
Collection of ready-to-use adapters. Supports: OpenAI, Anthropic, Gemini, Grok, Ollama, DeepSeek, Kimi, LangChain, LangGraph (with stream and streamEvents), Vercel AI SDK, and a generic adapter for any `ReadableStream`. Clear contract for creating custom adapters via `createAdapter()`. Zero UI dependency — works with core, runtime, react, and ink.

### @agentskit/runtime
Standalone agent runtime (no UI required). Supports ReAct loop, reflection, planning, and multi-agent orchestration. Simple API: `runtime.run(task, options?)`. Built-in support for tools, skills, memory, and RAG. Can output to console, stream, or connect to any UI. Goal: run full agents with one line of code.

### @agentskit/tools
Marketplace of reusable executable tools. Includes: browser (Puppeteer), filesystem, telegram, resend, web search, calendar, code execution, etc. Each tool follows strict contract (`name`, `description`, `schema`, `execute`). Auto-discovery and registration in runtime and chat. Supports parallel tool calling and human confirmation.

### @agentskit/skills
Collection of ready-made skills (prompts + behavioral instructions). Each skill contains: `name`, `description`, `systemPrompt`, few-shot examples, best practices. Examples: researcher, critic, planner, coder, summarizer. Easy to combine, override, or extend. Designed for use with runtime and multi-agent setups.

### @agentskit/memory
Persistent and vector memory layer. Implementations: in-memory, localStorage, file, SQLite, Redis, LanceDB (vector). Clear contract for custom memory adapters. Supports hydration, serialization, and long-term storage. Works across React, Ink, runtime, and CLI.

### @agentskit/rag
Simplified plug-and-play RAG. Handles document chunking, embedding, retrieval, and context injection. Default integration with `@agentskit/memory` (vector store). Easy API: `rag.retrieve(query)` and `useRAGChat()`. Goal: add RAG capability in few lines.

### @agentskit/sandbox
Secure execution of agent-generated code. Primary backend: E2B (preferred), with WebContainer fallback. Supports JS and Python code execution with timeouts and restrictions. Tool: `@agentskit/tools/code` uses the sandbox. Strict security: no network by default, resource limits.

### @agentskit/observability
Logging and tracing layer. Integrates with LangSmith, OpenTelemetry, and console. Captures LLM calls, tool executions, memory operations, and agent steps. Simple API: `observability.enable()` or middleware. Non-blocking and optional.

### @agentskit/eval
Agent evaluation and benchmarking. Supports metrics: accuracy, latency, cost, token usage, success rate. Built-in test suites for common agent tasks. API: `eval.run(agent, testCases)`. Designed for CI/CD and iterative improvement.

## Code Conventions

- TypeScript strict mode, no `any` — use `unknown` and narrow
- Named exports only, no default exports
- Components are headless — no hardcoded styles, use `data-ak-*` attributes
- All packages build with tsup, dual CJS/ESM output
- Tests use vitest
- Changesets for versioning (`pnpm changeset`)
