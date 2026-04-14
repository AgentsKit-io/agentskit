# AgentsKit Manifesto

> These are the non-negotiable principles that shape AgentsKit. Every design decision, every PR, every package is measured against them. If a principle is ever about to be broken, we stop and reconsider — never rationalize.

---

## 1. The core is sacred

`@agentskit/core` will always be **under 10KB gzipped with zero runtime dependencies**. It contains only types, contracts, and minimal orchestration primitives. Nothing gets added here unless it is foundational and permanent. Stability is the feature.

## 2. Every package is plug-and-play

Every package works standalone, with a single install and less than ten lines of configuration to produce something useful. If a package requires another package to function at all, we have an architecture problem — not a dependency problem.

## 3. Interop is radical, not optional

Any combination of AgentsKit packages must compose without glue code. React + Runtime + Memory + RAG + Observability should just work. The contract is the API — shared types, shared events, shared semantics across the entire ecosystem.

## 4. Zero lock-in

Leaving AgentsKit must be a single `npm uninstall` away. No proprietary formats, no captive state, no hidden coupling. Adapters, memory stores, tools — all are replaceable. We earn our place every day.

## 5. Agent-first, not chat-first

AgentsKit is not a chat library that happens to support tools. It is an agent runtime that happens to render chat. Tools, skills, memory, and reasoning loops are primary citizens — UI is one surface among many (React, Ink, CLI, headless).

## 6. Docs are product, not afterthought

Documentation is not written after shipping. Every feature lands with: a concept page, a recipe, an API reference, and a troubleshooting entry. If it isn't documented, it doesn't exist.

## 7. TypeScript rigor, no escape hatches

Strict mode always. `any` is forbidden — use `unknown` and narrow. Public APIs have inferred, provable types. Schema-first means `Tool` signatures *become* `.execute` return types without a second declaration.

## 8. Small, deep, testable modules

Every module is deep: a simple, stable interface hiding meaningful behavior. Tests target external contracts, not implementation details. When a module shows up in multiple test files as a mock, it should become a real primitive.

## 9. Predictable is better than clever

A predictable API that takes ten minutes to learn beats a clever one that takes ten hours. If a new contributor can't understand a module in one sitting, we refactor — not rename.

## 10. Open by default

Roadmap is public. RFCs are public. ADRs are public. Post-mortems are public. Decisions made in private die in silence.

---

## What we will never do

- Ship a package that imports `@agentskit/core` and inflates it
- Break a contract without a deprecation cycle and a migration guide
- Add a feature that works only on one provider
- Write documentation in PR descriptions and hope users find it
- Accept "it works on my machine" — E2E or it didn't happen
- Invent a concept where a standard already exists (prefer MCP, A2A, JSON Schema, OpenAPI)

## What we will always do

- Read the manifesto before saying "yes" to a new feature
- Prefer deleting code to adding code
- Deprecate loudly, deprecate early, deprecate with a path forward
- Treat every release as a promise to someone building a business on top

---

*Last updated: 2026-04-14.*
*Changes to this manifesto require an RFC and maintainer consensus.*
