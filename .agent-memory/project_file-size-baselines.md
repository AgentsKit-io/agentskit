---
name: project_file-size-baselines
description: oversized source files are pinned in check-file-size; entries shrink only, never raise
metadata:
  type: project
---

**Fact:** `scripts/check-file-size.mjs` enforces per-package LOC budgets
(default 400; core 400, contracts 200, ui 500). Files already over budget when
the gate landed (2026-06-03) are pinned in `BASELINE` at their current size:

- `packages/cli/src/init.ts` — 1553
- `packages/adapters/src/utils.ts` — 575
- `packages/core/src/controller.ts` — 555
- `packages/observability/src/cost-guard-advanced.ts` — 462
- `packages/rag/src/loaders.ts` — 441

**Why:** Pinning lets the gate ship without a giant refactor while still
blocking growth. A pinned file that grows by one line fails CI.

**How to apply:** Never raise a baseline number. When you touch one of these
files, split it toward the package budget and *lower* (or remove) its baseline
entry. New files get the package budget, no baseline.

**Related:** [[reference_quality-gates]]
