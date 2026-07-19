# Package graduation evidence

Stable promotion evidence lives in one file per package:
`docs/stability/<package-directory>.json`. Beta and alpha packages may omit the
file until active graduation work begins. `@agentskit/core` is exempt under ADR
0024.

## Schema version 1

```json
{
  "schemaVersion": 1,
  "package": "@agentskit/example",
  "betaSince": "2026-01-10",
  "proposedStableDate": "2026-04-15",
  "qualifyingMinorReleases": [
    { "version": "0.8.0", "date": "2026-02-01" },
    { "version": "0.9.0", "date": "2026-03-10" }
  ],
  "evidence": {
    "publicApi": "docs/evidence/stability/example/public-api.md",
    "packageSmoke": "docs/evidence/stability/example/package-smoke.md",
    "completeness": "docs/evidence/stability/example/completeness.md",
    "resilience": "docs/evidence/stability/example/resilience.md",
    "compatibility": "docs/evidence/stability/example/compatibility.md",
    "sustainability": "docs/evidence/stability/example/sustainability.md",
    "breakingChangeAudit": "docs/evidence/stability/example/breaking-change-audit.md"
  }
}
```

Dates use UTC calendar dates (`YYYY-MM-DD`). The proposed stable date must be at
least 90 days after `betaSince`. Qualifying releases must be published during
that window and span at least two distinct minor lines. Evidence paths are
repository-relative files and must exist.

The evidence files contain package-specific results, commands, environments,
and limitations. They are not check-box declarations. A breaking change during
beta resets `betaSince`; the audit explains the review and confirms that no
unplanned break occurred in the qualifying window.
