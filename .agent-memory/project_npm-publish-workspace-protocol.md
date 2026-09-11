---
title: npm publish path must resolve workspace: ranges
name: project_npm-publish-workspace-protocol
description: the release publishes via npm (OIDC), which does not rewrite pnpm's workspace: protocol; scripts/publish-with-npm.mjs resolves it and guards the packed manifest
metadata:
  type: project
---

**Fact:** The release publishes through `changeset publish` using the **npm**
client (npm OIDC trusted publishing, pinned npm tarball in
`.github/workflows/release.yml`). `scripts/publish-with-npm.mjs` hides
`packageManager` and `pnpm-lock.yaml` so changesets' `preferred-pm` picks npm.
Unlike `pnpm publish`, `npm publish` does **not** rewrite `workspace:*`, so
every release up to 2026-09-11 (e.g. `@agentskit/ink@0.10.10`) shipped
`"@agentskit/core": "workspace:*"` and was uninstallable outside the monorepo.

**Why:** Switching to `pnpm publish` was rejected because the npm OIDC flow
took several fixes to stabilize and is the only verified trusted-publishing
path.

**How to apply:** Keep `workspace:*` in source manifests. The publish script
resolves them to concrete versions (same semantics as pnpm: `*`→exact,
`^`/`~`→prefixed) for the duration of the publish, packs every public package
with the same npm client, and fails if the tarball's `package.json` still
contains `workspace:`. `pnpm check:publish-manifests` runs that guard in CI
and in the release job before changesets publish; run it locally after touching
publish tooling. `pnpm check:packed-consumers` uses `pnpm pack` and therefore
cannot catch this class of bug.
