---
---

chore(docs): G/P2 polish batch — Angular UI + sandbox deep-dive + 3 recipes.

Closes G/P2 #605, #607, #608, #609, #610. Six new docs pages:

- **`/docs/ui/angular`** (#605) — Angular binding's dedicated page,
  parallel to React/Vue/Svelte/Solid. Covers `AgentskitChat`
  service shape, Signal + RxJS interop, lifecycle, multi-instance
  via `providers: [AgentskitChat]`.
- **`/docs/production/security/sandbox`** (#610) — `@agentskit/sandbox`
  deep-dive: backends (E2B / WebContainer / custom), policy +
  sandbox composition, audit-trail wiring, failure-mode table with
  typed-error codes, cost + latency notes.
- **`/docs/reference/recipes/templates-cookbook`** (#609) — every
  `ScaffoldType`, programmatic factory examples
  (`createToolTemplate` / `createSkillTemplate` /
  `createAdapterTemplate`), custom-CLI integration pattern.
- **`/docs/reference/recipes/bail-qwen-routing`** (#607) — `bail` /
  `qwen` adapter, region selection, comparison table, embedder
  pairing via `createOpenAICompatibleEmbedder`, cost-aware router
  example.
- **`/docs/reference/recipes/vector-filter-helpers`** (#608) —
  `matchesFilter` outside-adapter usage, `postgresWithRoles`
  row-level-security pattern, hybrid combination of both.
