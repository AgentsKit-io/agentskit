# AgentsKit — Master PRD & Roadmap

> Base document consolidating ~160 ideas from the brainstorm into a phased roadmap.
> Each item is an **issue seed** — should become an independent GitHub issue at execution time.

---

## Problem Statement

JavaScript/TypeScript developers who want to build applications with AI agents today face a fragmented ecosystem:

- **Vercel AI SDK** is great for chat in Next.js, but weak on agent runtime, memory, multi-agent, and terminal.
- **LangChain.js** is heavy, hard to debug, with leaky abstractions and a giant bundle.
- **Mastra** and similar tools are promising but still limited in UI, adapters, and tooling.
- **MCP** solves tool interop but does not provide UI, runtime, or orchestration.

The result: to build a "real" JS agent (with React/terminal UI, persistent memory, RAG, multi-agent, observability, edge deploy), developers have to glue 5–8 incompatible libraries together, spend weeks on integration, and still end up without decent debugging, evals, or replay.

Also missing: initial experience (scaffolding), dogfooded docs, a tools/skills marketplace, and open interop standards across ecosystems.

## Solution

**AgentsKit** — a modular, plug-and-play toolkit that covers the full JS agent lifecycle:

- **Lightweight core** (<10KB gzip, zero deps) as a stable foundation
- **Independent packages** that compose freely (React, Ink, CLI, runtime, tools, skills, memory, RAG, sandbox, observability, eval)
- **First-class DX**: scaffolding, hot-reload, devtools, deterministic replay
- **Open marketplace** for tools and skills with versioning
- **Radical interop**: bidirectional MCP, Agent-to-Agent protocol, one-command migration from LangChain/Vercel AI
- **Edge-ready**: runs on Cloudflare Workers, Deno Deploy, pure browser (WebLLM)
- **Optional Cloud** (generous free tier) + self-hosted enterprise as a monetization layer

Goal: be **the Vercel/Next.js of the agent era** — opinionated where it matters, extensible where needed, the default recommended by providers (OpenAI, Anthropic, xAI).

---

## Phases

### Phase 1 — Foundation & Ecosystem Improvements (0–3 months)
Goal: solidify the core, remove onboarding friction, make the library "usable by a stranger in an afternoon".

### Phase 2 — Technical Evolution (3–6 months)
Goal: real technical differentiation — features nobody else ships well. This is what becomes a Hacker News post.

### Phase 3 — Ecosystem Expansion (6–9 months)
Goal: widen the surface — multi-framework, marketplaces, verticals, open protocols.

### Phase 4 — Business & Monetization (9–12 months)
Goal: a sustainable commercial layer that does not compromise open source.

---

## User Stories

### Phase 1 — Foundation

1. As a developer new to AgentsKit, I want to run `npx @agentskit/cli init` and pick a template interactively, so I have a working project in under 2 minutes.
2. As a developer, I want to run `agentskit doctor` and see missing env vars, incompatible versions, and invalid keys, so I don't waste time debugging config.
3. As a developer, I want `agentskit dev` with hot-reload for prompts/tools/memory, so I can iterate fast without restarting.
4. As a developer, I want `agentskit tunnel` to expose my local agent at a temporary public URL, so I can test webhooks.
5. As a developer, I want automatic retry with backoff and circuit breaker in adapters, so I don't have to write that boilerplate.
6. As a developer in dev/test, I want a "dry run" mode that simulates mocked LLM responses, so I can run tests without spending tokens.
7. As a developer, I want zero-config streaming (detected from provider capability), so I don't have to configure it manually.
8. As a frontend developer, I want `useChat` with native optimistic UI, message editing, and regeneration.
9. As a developer paying the bill, I want a cost guard with per-session/per-user limits and alerts, so I don't get a shock at the end of the month.
10. As a developer, I want a universal pre-send token counter, abstracted from each provider's tokenizer.
11. As a developer, I want to swap providers (OpenAI ↔ Anthropic) at runtime without a restart, for fallback and A/B.
12. As a developer visiting the docs, I want an embedded chat that answers questions about the library itself using RAG over the docs.
13. As an evaluating developer, I want a 5-question "decision tree" that tells me which package I need.
14. As a developer coming from LangChain/Vercel AI, I want a concrete migration guide with side-by-side code diffs.
15. As a developer reading the docs, I want a Stackblitz "Edit on..." link in every example, so I can try without cloning.
16. As a developer, I want short recipes ("chat with RAG in 30 lines", "agent that reads Gmail") before I read the full reference.
17. As a developer, I want an honest comparison: AgentsKit vs Vercel AI SDK vs LangChain vs Mastra.
18. As a developer, I want didactic error messages in the Rust compiler style — with a link to the docs plus a fix suggestion.
19. As a developer writing a tool, I want the tool's Zod/JSON schema to become the TypeScript return type automatically.
20. As a maintainer, I want a public roadmap and an open RFC process on GitHub, to align with the community.

### Phase 2 — Technical Evolution

21. As a debugging developer, I want **deterministic replay**: record the seed plus every LLM call and reproduce bit-for-bit, to debug flakiness.
22. As a developer, I want **prompt snapshot testing** with semantic tolerance, Jest snapshot style.
23. As a developer, I want a **prompt diff tool** that shows which change caused which output change (git blame for prompts).
24. As a developer, I want **time-travel debugging** in the trace viewer — go back in time, change a tool output, re-run.
25. As a developer, I want a **token budget compiler** — I declare "this agent has 10k tokens" and the framework optimizes prompts/memory.
26. As a developer, I want **speculative execution** — run N paths in parallel with cheap models, pick the best.
27. As a developer, I want **progressive streaming tool calls** — the tool starts executing before the LLM finishes the args (when the schema allows it).
28. As a developer, I want transparent **context window virtualization**, so I can support huge conversations.
29. As a developer, I want **unified multi-modal** — the same API for text/image/audio/video regardless of the provider.
30. As a developer, I want **schema-first agents** — define an agent in YAML/JSON and generate typed TS.
31. As a developer, I want **`npx agentskit ai`** — describe an agent in natural language and generate config + tools + skill.
32. As a developer, I want a **router adapter** — picks a model automatically by cost/latency/task.
33. As a developer, I want an **ensemble adapter** — sends to N models and aggregates (voting/best-of).
34. As a developer, I want a declarative **fallback-chain adapter** with confidence scores.
35. As a developer, I want a **devtools browser extension** that inspects messages, tool calls, tokens, and costs in real time.
36. As a developer, I want a **local trace viewer** in the Jaeger style for offline debugging.
37. As a developer, I want to run **evals in CI** via a GitHub Action with dataset templates.
38. As a developer, I want **prompt A/B testing** integrated with feature flags (PostHog/GrowthBook).
39. As a developer, I want **session replay** that re-runs with a different model for comparison.
40. As a developer, I want **hierarchical memory** (working/episodic/semantic) in the MemGPT style, out of the box.
41. As a developer, I want **auto-summarization** when the context window fills up.
42. As a developer, I want **RAG with re-ranking** (Cohere Rerank, BGE) and **hybrid search** (BM25 + vector).
43. As a developer, I want **durable execution** in the Temporal style — the agent survives a crash.
44. As a developer, I want ready-made **multi-agent topologies** (supervisor, swarm, hierarchical, blackboard).
45. As a developer, I want **human-in-the-loop primitives** — persisted pause/resume/approve.
46. As a developer, I want **background agents** that run on cron or react to webhooks.
47. As a security-conscious developer, I want **PII redaction middleware** before sending.
48. As a developer, I want a built-in **prompt injection detector** (e.g., Llama Guard local).
49. As an enterprise developer, I want a **signed audit log** for SOC2/HIPAA compliance.
50. As a developer, I want **rate limiting** per user/IP/key.
51. As a developer, I want a **mandatory tool sandbox** (WebContainer/isolated-vm) for tools that execute code.

### Phase 3 — Expansion

52. As a developer, I want adapters for **Mistral, Cohere, Together, Groq, Fireworks, Replicate, OpenRouter, Bedrock, Azure OpenAI, Vertex AI, xAI/Grok, HuggingFace**.
53. As a developer, I want an adapter for **local models** (llama.cpp, LM Studio, vLLM, Ollama).
54. As a developer, I want a **bidirectional MCP bridge** — consume any MCP server AND publish AgentsKit tools as MCP.
55. As a developer, I want a **tool composer** to chain N tools into a single macro tool.
56. As a developer, I want ready-made tools: **GitHub, Linear, Jira, Notion, Asana, Slack, Discord, Teams, WhatsApp**.
57. As a developer, I want tools: **Google Workspace (Drive, Docs, Sheets, Calendar, Gmail), Microsoft 365**.
58. As a developer, I want tools: **Stripe, Supabase, Postgres, MySQL, Mongo (with safe-mode), S3/R2/GCS**.
59. As a developer, I want tools: **web scraping (Playwright + Firecrawl + Reader), PDF/DOCX/XLSX parsing**.
60. As a developer, I want tools: **image gen (DALL-E, Flux, SD, Recraft), TTS/STT (ElevenLabs, Whisper, Deepgram)**.
61. As a developer, I want tools: **Maps, Weather, CoinGecko, Yahoo Finance**.
62. As a developer, I want a **Browser Agent tool** (Playwright + vision, click and fill forms) in an isolated sandbox.
63. As a developer, I want a **self-debug tool** — the agent receives a tool-call error and tries to fix it on its own.
64. As a developer, I want **memory adapters**: Postgres+pgvector, Pinecone, Qdrant, Chroma, Weaviate, Turso, Cloudflare Vectorize, Upstash.
65. As an end user, I want **client-side encrypted memory** where I control the key.
66. As a developer, I want a **memory graph** (non-linear graph of relationships).
67. As a developer, I want a **personalization layer** — a user profile persisted across sessions.
68. As a developer, I want ready-made **doc loaders**: URL, PDF, GitHub repo, Notion, Confluence, Drive.
69. As a developer, I want a **skill marketplace** with versioning and ratings (npm style).
70. As a developer, I want ready-made skills: **code reviewer, test writer, PR describer, commit gen, SQL gen, translator, email triager, meeting summarizer, lead qualifier, debate agents, agent auditor**.
71. As a frontend developer, I want a **shadcn/ui registry** — `npx shadcn add agentskit-chat`.
72. As a frontend developer, I want components for **Vue, Svelte, Solid, Qwik**.
73. As a mobile developer, I want a **React Native + Expo** package.
74. As a developer, I want **generative UI** — the model returns structured JSON and components render it.
75. As a developer, I want a **voice mode** component (push-to-talk, VAD, barge-in).
76. As a developer, I want **artifact rendering** (code, charts, markdown, HTML sandbox) in the Claude.ai style.
77. As an edge developer, I want **AgentsKit Edge** — minimal runtime <50KB with <10ms cold start on Cloudflare Workers/Deno Deploy.
78. As a developer, I want **AgentsKit Browser-only** with WebLLM/WebGPU (100% client-side).
79. As an extension developer, I want **AgentsKit for VS Code**, **Raycast/Alfred**, **embedded/IoT**.
80. As a verticals developer, I want **templates: Healthcare (HIPAA), Finance (SOX), E-commerce (Shopify), DevRel/Support, Education, Gaming**.
81. As a developer, I want an **Agent-to-Agent Protocol (A2A)** — an open spec for agents from different ecosystems to talk.
82. As a developer, I want a **Skill Manifest Spec** and a **Tool Manifest compatible with MCP** — interop with LangChain/Mastra.
83. As a developer, I want an **Open Eval Format** — datasets and results interchangeable between AgentsKit/Braintrust/LangSmith.
84. As a developer, I want **`agentskit flow`** — a visual YAML editor that compiles to a durable DAG.
85. As a community maintainer, I want a curated **awesome-agentskit**, **Agent of the Week**, **AgentsKit University** (video course), **monthly hackathons**, a **bounty program**.

### Phase 4 — Business & Monetization

86. As a hobbyist developer, I want a generous **AgentsKit Cloud Free Tier** (agents + 1 small vector store) — to try without a credit card.
87. As a professional developer, I want **AgentsKit Cloud** with hosted runtime, observability, vector store, and 1-click deploy.
88. As a developer, I want a **Pro Marketplace** with premium tools licensed per user.
89. As an enterprise, I want **self-hosted air-gapped + SOC2/HIPAA** with dedicated support.
90. As a company, I want **SSO (SAML/OIDC), full audit log, multi-tenant isolation**.
91. As a popular skill/tool author, I want **revenue share** when my asset is used in the marketplace.
92. As a company, I want an **AgentsKit Certification** program — an official seal for projects and developers.
93. As a community, I want an annual **AI Agent Conference** organized by AgentsKit.
94. As an enterprise customer, I want **partnership with Vercel** (official deploy button), **Cloudflare Workers** (optimized edge runtime), **Bun/Deno** (first-class).
95. As a developer, I want **co-marketing with providers** — Anthropic/OpenAI/xAI recommending AgentsKit as the official JS path.
96. As an ops team, I want **carbon-aware + cost-aware routing** with a public "green agent" badge.
97. As a critical-production developer, I want **Agent Insurance** — output guarantee via ensemble + validator with refund on failure.

---

## Implementation Decisions

### Overall architecture
- **Existing pnpm + Turborepo monorepo** — keep it.
- `@agentskit/core` stays zero-deps, <10KB gzip. Everything new ships in separate packages.
- Suggested new packages: `@agentskit/devtools`, `@agentskit/edge`, `@agentskit/replay`, `@agentskit/eval`, `@agentskit/cloud-sdk`, `@agentskit/vue`, `@agentskit/svelte`, `@agentskit/native`.
- Each new adapter is a subpath: `@agentskit/adapters/mistral`, etc.

### Deep modules (candidates for isolated tests)
- **ReplayEngine** — deterministically records/reproduces sessions. Interface: `record(session)`, `replay(id, patches?)`. Encapsulates seed management, LLM call serialization, semantic diff.
- **TokenBudgetCompiler** — takes a prompt tree + budget, returns an optimized prompt. Interface: `compile(tree, budget) → OptimizedPrompt`.
- **RouterAdapter** — selects a provider by policy. Interface: `route(request, policy) → Adapter`.
- **MemoryGraph** — graph of entities/episodes/goals. Interface: `add(node, edges)`, `query(traversal)`.
- **ToolSandbox** — runs untrusted code. Interface: `run(code, limits) → Result`.
- **PromptDiffer** — compares outputs semantically. Interface: `diff(outputA, outputB) → DiffReport`.
- **EvalRunner** — runs a test suite against an agent. Interface: `run(agent, dataset, metrics) → Report`.

### Contracts / APIs
- **A2A Protocol** — versioned JSON-RPC spec over HTTP/WebSocket. Stay compatible with MCP where possible.
- **Skill Manifest** — public JSON schema with `name`, `description`, `systemPrompt`, `examples`, `version`, `compatible: ["agentskit@^1", "langchain@^0.3"]`.
- **Tool Manifest** — a superset of the MCP tool manifest; if it only uses the MCP subset, it should run on MCP clients unmodified.
- **Open Eval Format** — OpenAI evals + extensions (latency, cost, carbon).

### Prioritization inside each phase
Within a phase, prioritize by: (1) impact on the public narrative, (2) unblocking of other features, (3) effort. Detailed matrix in a separate issue when the phase starts.

### Breaking changes
- Phases 1–2 introduce no breaking changes in the core.
- Phase 3 may bump `@agentskit/react` to v2 if necessary (generative UI).
- Changesets required on every PR.

---

## Testing Decisions

### What makes a good test here
- Tests **external behavior**, not implementation. Example: "when the LLM returns a tool_call, the tool is invoked with the correct args" — not "the `_parseToolCall` method is called".
- Uses **deterministic mock adapters** (recorded via ReplayEngine) instead of fragile hand-written mocks.
- Avoids snapshot testing of raw LLM strings — uses semantic tolerance or structured matchers.

### Modules that must have tests
- **ReplayEngine, TokenBudgetCompiler, RouterAdapter, MemoryGraph, ToolSandbox, EvalRunner, PromptDiffer** — deep modules with high test leverage.
- Every new **adapter**: contract test (streaming, tool calling, multi-modal when applicable) running against a real recording + mock.
- Every new **tool**: schema validation + mocked execution test.

### Prior art
- Vitest is already the default runner.
- Use the existing `@agentskit/adapters` test as a template.
- E2E with Playwright for React/Ink components and the devtools extension.

### Skills/Tools (asset marketplace)
- Every published skill must ship with a **golden dataset** (10–50 input/expected examples) run in the marketplace CI.

---

## Out of Scope (for this master document)

- **Final detailed prioritization** (impact × effort × differentiation) — lives in a separate document/issue when each phase starts.
- **Cloud pricing** — defined closer to Phase 4.
- **Go-to-market and marketing** — complementary, not a technical PRD.
- **Python SDK implementation** — AgentsKit is JS-first; Python is out.
- **Training our own models** — AgentsKit is an integration layer, not a foundation model.
- **Model hosting** — delegated to providers (OpenRouter, Together, etc.).

---

## Further Notes

### How this doc becomes issues
Every user story (1–97) should become **1 GitHub issue** with:
- Title: "`[Phase X] Story NN — <summary>`"
- Label: `phase-1-foundation` | `phase-2-evolution` | `phase-3-expansion` | `phase-4-business`
- Package label: `pkg:core`, `pkg:adapters`, `pkg:react`, etc.
- Type label: `type:feature`, `type:dx`, `type:docs`, `type:tool`, `type:adapter`, `type:infra`.
- Link back to this PRD.

Large stories (e.g., #54 MCP bridge, #77 AgentsKit Edge, #84 agentskit flow) become **epics** with sub-issues.

### Strategic bets (if we need to cut)
If everything else fails, these 3 bets are the minimum for AgentsKit to differentiate:
1. **Deterministic replay + prompt diff + time-travel debug** (stories 21–24) — the "finally you can debug agents" narrative.
2. **AgentsKit Edge** (story 77) — empty territory, Vercel AI SDK does not cover it well.
3. **Bidirectional MCP bridge + A2A Protocol** (stories 54, 81–83) — AgentsKit as the interop layer.

### Non-negotiable principles (already in CLAUDE.md)
- Core <10KB gzip, zero deps.
- Every package plug-and-play.
- Total interop across packages.
- Named exports only, no default exports.
- TypeScript strict, no `any`.
