---
title: Changesets for ignored packages must never count as a pending release train
name: project_ignored-package-changesets-block-release
description: changeset version never consumes a changeset that only names packages under .changeset/config.json ignore (docs-next etc.); the release preflight and workflow must filter them or every publish after such a changeset fails
metadata:
  type: project
---

**Fact:** `changeset version` leaves untouched any changeset whose packages
are all listed under `ignore` in `.changeset/config.json` (e.g.
`@agentskit/docs-next`). On 2026-09-16 one such file made
`scripts/check-release-registry.mjs` report "pending changesets: yes" on the
publish run after #1573, and the preflight refused to publish 20 already
versioned packages ("pending changesets cannot be stacked on unpublished
local versions").

**Why:** The preflight and the workflow's "Detect release intent" step
counted every `.changeset/*.md`. Recovery needs a manual
`workflow_dispatch` with `recover_unpublished: true`.

**How to apply:** `listReleasableChangesets` in
`scripts/lib/release-registry.mjs` filters by the ignore list; the preflight
and `scripts/list-releasable-changesets.mjs` (used by release.yml) rely on
it. Do not add changesets for ignored packages; if one lands, delete it.
release.yml also treats committed-but-unpublished versions as release
intent, so any push to `main` retries the publish once the blocker is gone;
the `recover_unpublished` dispatch remains the manual override. A GitHub
"Re-run jobs" of a failed publish reuses the old commit and fails the same
way.
