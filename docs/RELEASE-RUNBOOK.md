# Release runbook

This runbook covers version PRs, npm publication, and recovery for the public
`@agentskit/*` packages. Package graduation rules remain in
[`STABILITY.md`](./STABILITY.md).

## Release invariants

- Never stack a new changeset train on package versions that are committed but
  absent from npm.
- Never publish from a developer machine or a long-lived npm token. The
  `Release` workflow owns publication through npm trusted publishing and GitHub
  OIDC provenance.
- Never unpublish a partial release. Repair authorization and rerun publication;
  npm versions are immutable and the Changesets publisher skips versions that
  already exist.
- A failed publish does not start a beta soak clock. The clock starts from the
  date the intended package version is visible in the npm registry.

## Trusted publisher configuration

Every public package must configure the same GitHub Actions trusted publisher
in npm package settings:

| Field | Value |
| --- | --- |
| Organization or user | `AgentsKit-io` |
| Repository | `agentskit` |
| Workflow filename | `release.yml` |
| Environment name | `npm` |
| Allowed action | `npm publish` |

The workflow uses GitHub-hosted runners, `id-token: write`, Node 22, an exact npm
11 version, public provenance, and no dependency cache. Do not add
`NPM_TOKEN`/`NODE_AUTH_TOKEN` secrets to the workflow.

## Normal release train

1. Confirm `main` is aligned with npm and has no older unpublished manifests:
   `pnpm check:release-registry`.
   `pnpm release:preflight` runs the complete local, non-publishing contract.
2. Merge reviewed package changes and their changesets.
3. Review the Changesets version PR, including every resulting version,
   dependency-range change, public API snapshot, and generated changelog.
4. Merge the version PR. The `Release` workflow builds packed consumers,
   validates publication surfaces, and publishes through OIDC.
5. Confirm each intended version and `latest` dist-tag in npm. Record the actual
   publication date in stability evidence only after this verification.

## Recover committed but unpublished versions

An authorization failure can leave package manifests ahead of npm. Do not merge
another version PR in this state.

The release runs for version commits `#1238` and `#1249` failed this way on
2026-07-14 and 2026-07-16. The latest run reached signed provenance generation
but npm rejected all 22 public package `PUT` requests with `E404`. Treat the
currently committed versions as one recovery train before the ecosystem
hardening changesets are versioned.

1. Compare the failed workflow package list with
   `pnpm check:release-registry -- --json`.
2. Correct the trusted publisher fields for every affected package. A registry
   `E404` during `PUT` can mean that npm deliberately hid an authorization
   failure; package existence alone does not prove publish permission.
3. In GitHub Actions, manually run `Release` with
   `recover_unpublished: true` from `main`. Recovery invokes
   `changeset publish` directly: it publishes manifest versions missing from
   npm and does not consume or version pending changesets.
4. Rerun the registry preflight. It must report zero unpublished versions and
   zero conflicts.
5. Only then merge the next changeset train.

## Rollback

npm versions cannot be replaced. For a bad release, keep the artifact, move
`latest` back to the last known-good version if necessary, and ship a forward
fix as a new patch or minor according to the package tier. Record the incident,
affected versions, dist-tag action, and recovery release. Never force-push or
rewrite a version commit.
