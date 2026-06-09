---
"@agentskit/adapters": minor
---

Add a data-driven provider/model catalog at `@agentskit/adapters/catalog`,
adapted from the `models.dev` data source into AgentsKit's own schema and cached
as a committed, schema-validated snapshot. Implements #911.

- **Catalog contract (JSON Schema, public export).** `catalogSnapshotSchema`
  plus typed `CatalogSnapshot`/`CatalogProvider`/`CatalogModel`. JSON Schema is
  canonical; the snapshot is validated at build via the opt-in Ajv path
  (`@agentskit/validation`), never at runtime.
- **Build-time sync tool.** `scripts/sync-models-dev.mjs` (`pnpm sync:models`)
  fetches `models.dev`, normalizes to our schema, and emits the snapshot. The
  runtime **never** fetches `models.dev`; the snapshot carries `generatedAt` +
  pinned `source.version` so consumers can reason about staleness.
- **Native OpenAI-compatible dispatch.** `dispatchFromCatalog()` maps any
  provider `models.dev` marks OpenAI-compatible to the existing native adapter
  (no `@ai-sdk/*` runtime). First-class providers (anthropic/openai/google/
  ollama) keep their authoritative factories.
- **Override layer.** `applyOverrides()` for allowed/disabled providers and
  per-provider model allow-lists, with documented precedence; input snapshot is
  never mutated.
- **Drift helper.** `detectCatalogDrift()` flags any snapshot provider that is
  neither first-class nor OpenAI-compatible — run in CI so a regenerated
  snapshot can't ship an unroutable provider silently.
- **Pricing resolver.** `resolveCost()` is cache-only by default (offline,
  deterministic); opt-in `{ live: true }` tries a live lookup and falls back to
  the cached snapshot on any failure, never throwing on a network problem.

The snapshot is large, so the catalog ships only via the `./catalog` subpath —
the main `@agentskit/adapters` bundle is unaffected.
