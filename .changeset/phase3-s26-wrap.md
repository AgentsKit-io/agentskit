---
'@agentskit/core': minor
---

Phase 3 sprint S26 (wrap) — issues #187, #189, #194, #195, #196.

Five new core subpaths, every one a typed schema + validator with
no runtime cost to the main bundle:

- `@agentskit/core/generative-ui` — typed UI element tree
  (`text`/`heading`/`list`/`button`/`image`/`card`/`stack`/`artifact`)
  + artifact types (`code`/`markdown`/`html`/`chart`). `parseUIMessage`
  tolerates fenced JSON in prose; `detectCodeArtifacts` lifts code
  blocks out of plain text streams. Covers issues #187 + #189.
- `@agentskit/core/a2a` — Agent-to-Agent protocol spec. JSON-RPC
  methods (`agent/card`, `task/invoke`, `task/cancel`,
  `task/approve`, `task/status`) + `validateAgentCard`.
- `@agentskit/core/manifest` — Skill & Tool manifest format,
  MCP-compatible tool descriptors for round-tripping.
- `@agentskit/core/eval-format` — Open eval format for datasets +
  run results, plus `matchesExpectation` interpreter.

27 new tests. Core bundle still 8.7 KB / 9.7 KB gzipped (every
spec subpath tree-shakes out of `index`).

**Deferred to follow-up sprints** (tracked as open issues): voice
mode + VAD/barge-in (#188), AgentsKit Edge sub-50 KB bundle (#190),
WebLLM browser-only adapter (#191), VS Code / Raycast extensions
(#192), vertical templates (#193), visual flow editor (#197),
community program (#198).
