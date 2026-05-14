---
"@agentskit/core": minor
"@agentskit/tools": minor
---

Phase 2 reliability + quotas (tracks issue #841):

- **`@agentskit/core/security` rate-limiter**: bounded memory.
  `maxEntries` cap (default 100k) evicts the oldest-touched entry on
  overflow; `ttlMs` (default 1 h) drops idle entries lazily on `check`.
  Replaced the `::` separator with the Unit-Separator char (`\x1f`) so
  keys containing `::` can no longer collide with `reset()`.
- **`@agentskit/core/security` vault**: `reveal()` no longer returns
  the `denied` count on the public result. The number of tokens that
  exist-but-were-denied was a token-existence oracle; it now reaches
  operators only through the audit sink (BREAKING for callers that
  destructured `denied`).
- **`@agentskit/core/security` injection detector**: docs gained a
  defense-in-depth banner + classifier wiring recipe. Heuristic set
  expanded (PT/ES variants of the override family, base64-blob smell,
  fixed `tool-smuggle` regex that broke on nested objects).
- **`@agentskit/tools/mcp` `toolsFromMcpClient`**: server-provided
  metadata is now treated as untrusted input. New options:
  `maxDescriptionBytes` (default 4 KB, truncates), `maxSchemaBytes`
  (default 64 KB, drops tool when exceeded), `quarantine` (default
  `true`; prefixes tool name with `mcp:` and adds `[mcp]` provenance
  hint to the description). Opt-out: `quarantine: false`.
