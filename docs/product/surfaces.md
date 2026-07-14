# Surfaces

Inventory of consumer-facing surfaces. Status: `stable` / `beta` / `planned`
(mirrors each package's `agentskit.stability` field where present).

## Programmatic APIs (packages)

| Surface | Package | What it exposes | Status |
|---|---|---|---|
| Core primitives | `@agentskit/core` | types, events, contracts, `createChatController`, error system, `ArgsValidator` | stable |
| Provider adapters | `@agentskit/adapters` | OpenAI, Anthropic, Gemini, Grok, Ollama, DeepSeek, Kimi, LangChain/Graph, Vercel AI, generic | stable |
| React UI | `@agentskit/react` | `useChat`, headless components, theme | stable |
| Terminal UI | `@agentskit/ink` | Ink chat components | stable |
| Framework bindings | `@agentskit/vue` `/svelte` `/solid` `/angular` `/react-native` | `useChat` equivalents | beta |
| Runtime | `@agentskit/runtime` | `createRuntime`, ReAct loop, planning, delegation | beta |
| Tools | `@agentskit/tools` | executable tool marketplace, MCP client, `defineZodTool` | beta |
| Skills | `@agentskit/skills` | ready-made skills (prompts + behavior) | beta |
| Memory | `@agentskit/memory` | in-memory, localStorage, file, SQLite, Redis, LanceDB | beta |
| RAG | `@agentskit/rag` | chunking, embedding, retrieval, context injection | beta |
| Sandbox | `@agentskit/sandbox` | E2B / WebContainer code execution | beta |
| Observability | `@agentskit/observability` `/observability-langfuse` | logging, tracing, spans | beta |
| Eval | `@agentskit/eval` `/eval-braintrust` | metrics, scorers, regression alerts | beta |
| Validation | `@agentskit/tools/validation` | Ajv-backed `ArgsValidator` (ADR-0008) | beta |

## CLI

| Surface | Command | Status |
|---|---|---|
| Interactive chat | `agentskit chat` | beta |
| Project generator | `agentskit init` (React / Ink templates) | beta |
| Run agent | `agentskit run` | beta |

## Documentation

| Surface | Location | Status |
|---|---|---|
| Docs site (Fumadocs) | `apps/docs-next` → docs.agentskit.io | stable |
| For-agents reference | `content/docs/for-agents/*` | stable |
| Localized docs | EN (full); PT (seed); ES, ZH (planned) — `lib/locales.ts` | partial |

## External integrations (untrusted boundaries)

LLM provider HTTP endpoints (via adapters), MCP servers/transports, tool
network egress (web search, browser, telegram, resend, calendar), sandbox
backends (E2B), vector/DB stores. Trust treatment: see
`docs/security/threat-model.md`.
