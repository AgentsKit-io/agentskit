# Plan followed (#1860)

1. Installed deps, ran `ak-docs index` and `ak-docs doctor --json`: B 95, connectivity 77%, 15 undocumented areas.
2. Found the mechanism: front matter `docbridge.covers: area:<path>` (as used by production/cli/index.mdx). Plain path mentions did not count.
3. Added a truthful "Source layout" section plus `area:` covers to the for-agents docs for cli, adapters, cross-platform and core (10 areas whose code each section really describes).
4. Re-indexed; doctor now A 96, connectivity 86%, hit@3 0.8, MRR 0.7326.
5. Updated doctorScore 95 -> 96 in docs/evidence/ecosystem-documentation-quality/agentskit.json and doc-bridge/agentskit.json; regenerated .doc-bridge index.
6. No doc-bridge upgrade needed, no config exclusions needed, reviewedOn/reviewDueOn untouched, no baseline written.

Departures: the existing benchmark suite has 60 cases (o2 check wants 20-40); not trimmed because deleting cases is forbidden. `pnpm run build` cannot complete in this sandbox (adapters DTS build is OOM-killed, exit 137).
