---
'@agentskit/memory': minor
'@agentskit/rag': minor
'@agentskit/skills': minor
---

Phase 3 sprint S24 — issues #179, #180, #181, #182, #183.

- `@agentskit/memory` — `createInMemoryGraph` implements a typed
  knowledge graph (nodes + edges + BFS neighbors) against a
  `GraphMemory` contract that Neo4j / Memgraph / Neptune can back.
- `@agentskit/memory` — `createInMemoryPersonalization` +
  `renderProfileContext`. Per-subject trait profile with
  `get`/`set`/`merge`/`delete` + a system-prompt renderer that
  skips empties.
- `@agentskit/rag` — six document loaders: `loadUrl`,
  `loadGitHubFile`, `loadGitHubTree`, `loadNotionPage`,
  `loadConfluencePage`, `loadGoogleDriveFile`, `loadPdf` (BYO
  parser). All accept custom `fetch` for mocking.
- `@agentskit/skills` — `createSkillRegistry` + semver helpers
  (`parseSemver`, `compareSemver`, `matchesRange`) form a minimal
  marketplace: publish, list by publisher/tag, install by range.
- `@agentskit/skills` — four new ready-made skills: `codeReviewer`,
  `sqlGen`, `dataAnalyst`, `translator`.

~65 new tests.
