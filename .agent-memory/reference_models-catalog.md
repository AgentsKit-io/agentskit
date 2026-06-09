---
name: reference_models-catalog
description: models.dev-driven provider/model catalog in adapters — subpath isolation, no-runtime-fetch default, opt-in live pricing, openaiCompatible signal caveat
metadata:
  type: reference
---

**Fact:** `@agentskit/adapters/catalog` (issue #911) is a data-driven
provider/model metadata catalog adapted from `models.dev` into our own JSON
Schema (`catalogSnapshotSchema`, canonical per [[feedback_json-schema-canonical]])
and cached as a committed snapshot at `packages/adapters/src/catalog/snapshot.json`.

**Non-obvious decisions:**

- **Subpath isolation.** Snapshot is ~3.8 MB (≈5k models / 140 providers), so the
  catalog ships ONLY via the `./catalog` export (separate tsup entry). The main
  `@agentskit/adapters` bundle never imports it — keeps the lean bundle lean.
- **No runtime fetch (default).** Runtime loads the committed snapshot; it never
  fetches `models.dev`. If `models.dev` disappears we keep the last snapshot.
  Regenerate with `pnpm sync:models` (`scripts/sync-models-dev.mjs`), then commit.
  Snapshot carries `generatedAt` + pinned `source.version` for staleness checks.
- **Opt-in live pricing.** `resolveCost()` is cache-only by default; `{ live:true }`
  tries live `models.dev` then falls back to cache on ANY failure, never throws.
  This is the only network path and it is opt-in — does not break the offline default.
- **`openaiCompatible` signal caveat.** Derived from `models.dev` `npm ===
  '@ai-sdk/openai-compatible'`. Many genuinely-compatible providers (groq, mistral,
  cohere, openrouter, together, xai…) carry vendor-specific npm fields, so they are
  NOT auto-flagged compatible — `detectCatalogDrift()` lists them as `undispatchable`
  ("flagged" satisfies the acceptance criteria). `ollama` is local-only, absent from
  models.dev, excluded from the first-class drift check on purpose.
- **No `@ai-sdk/*` runtime.** OpenAI-compatible transport reuses the existing native
  `openai()` adapter via `dispatchFromCatalog()`. models.dev is input data only.

**Why:** Broad, current model coverage from a version bump instead of bespoke
per-provider HTTP, without runtime coupling or bundle bloat in the core path.

**Related:** [[feedback_json-schema-canonical]], [[feedback_zero-dep-core]],
[[reference_security-surfaces]] (egress/safeFetch pattern the live path should align with).
