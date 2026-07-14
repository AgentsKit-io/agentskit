# Ecosystem documentation and product readiness

Status: **executable**  
Certification issue: [#1204](https://github.com/AgentsKit-io/agentskit/issues/1204)  
Parent PRD: [#1198](https://github.com/AgentsKit-io/agentskit/issues/1198)

This harness answers a single question:

> Is the AgentsKit ecosystem documentation and product surface ready for broad promotion?

It does **not** replace repository CI. It aggregates versioned evidence for every in-scope product and returns `ready` or `blocked` (or `incomplete` when evidence is missing).

## Commands

```bash
# Fail unless overall status is ready (promotion gate)
pnpm check:ecosystem-readiness

# Always write archived JSON + Markdown under artifacts/ecosystem-readiness/
pnpm report:ecosystem-readiness

# Machine-readable stdout
pnpm check:ecosystem-readiness -- --json --write
```

Pin the audit date in tests:

```bash
ECOSYSTEM_READINESS_DATE=2026-07-14 pnpm check:ecosystem-readiness -- --json
```

## Layout

| Path | Role |
|---|---|
| `ecosystem-readiness/inventory.json` | In-scope products, canonical gates, freshness window, and narrow exceptions |
| `ecosystem-readiness/evidence/<product>.json` | Versioned evidence for one product |
| `scripts/lib/ecosystem-readiness.mjs` | Schema validation + evaluation |
| `artifacts/ecosystem-readiness/` | Generated reports (latest + dated) |

## Required gate categories

Every product evidence file must include exactly one canonical gate in each category. The gate `id` must equal its category, and every gate must carry at least one non-empty evidence reference:

- `quickstart`
- `documentation`
- `seo`
- `accessibility`
- `performance`
- `links`
- `llms`
- `doc-bridge`
- `chat`
- `readme`
- `security`
- `maturity`

Repository-native products (for example Code Review) may mark site-only categories as `skipped` only when the inventory explicitly allowlists that product/category/status with a justification and future expiry. Expired, mismatched, or ad-hoc `skipped`/`excepted` gates fail closed.

Evidence must not be future-dated and must be no older than `maxEvidenceAgeDays` (30 days in v1). Unknown gates, duplicate categories, empty evidence arrays, and stale manifests block promotion.

## Severity and promotion

| Severity | Effect |
|---|---|
| `p0` / `p1` `fail` or `blocked` | Overall status becomes `blocked`; promotion forbidden |
| `p2` / `info` | Recorded; does not alone block promotion |
| Missing evidence file | Overall `incomplete`; promotion forbidden |
| Stale/future evidence or invalid exception | Overall becomes `blocked`; promotion forbidden |

`check:ecosystem-readiness` exits `0` only when `promotionAllowed` is true.

## Updating evidence

1. Run the repository’s own gates (README Standard, Doc Bridge, Playwright, Lighthouse, etc.).
2. Update `ecosystem-readiness/evidence/<product>.json` with statuses, links, owners, and remediations.
3. Run `pnpm report:ecosystem-readiness` and attach `artifacts/ecosystem-readiness/latest.md` to the certification issue or release review.
4. Do not mark a gate `pass` without reproducible evidence.

## Current posture

All seven product evidence files pass their canonical gates. The certification result is
**`ready`** and `promotionAllowed` is true. Public publishing and external submissions still
retain their separate human-approval gates; product readiness does not bypass those controls.
