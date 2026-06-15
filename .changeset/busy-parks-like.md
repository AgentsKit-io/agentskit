---
---

Dependency maintenance only — no release. Bulk minor/patch `pnpm update -r`
(within existing `^`/`>=` ranges) + bounding the CVE-floor pnpm overrides with
upper majors. Consumer resolution is unaffected (ranges stay within the same
major) and no published package's public API or runtime behavior changes.
