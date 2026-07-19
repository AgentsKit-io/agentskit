# ADR 0025 — Public API snapshots and compatibility matrix

- Status: Accepted
- Date: 2026-07-16
- Supersedes: —
- Related issues: #1198

## Context

ADR 0024 requires explicit API and portability evidence before a package can
graduate. Workspace tests and successful builds do not detect accidental export
removal, declaration drift, broken packed resolution, or incompatibility with a
supported Node.js or TypeScript line.

The ecosystem contains 22 public packages and several host-specific surfaces.
A per-package API-extractor configuration would add substantial configuration
and review noise, while a single unversioned CI runtime would leave consumers on
other supported toolchain lines unprotected.

## Decision

AgentsKit commits a versioned public API snapshot generated from every public
declaration entry. Schema version 1 records package names, export subpaths,
public export conditions, exported symbol names, and whether each symbol is a
type, runtime value, or both. Asset-only exports are recorded structurally.

The snapshot deliberately excludes timestamps, package versions, inferred type
strings, declaration bodies, and private chunk filenames. Any drift fails CI.
Intentional additions and removals require an explicit baseline update whose
diff is reviewed alongside the affected package's changeset.

Packed consumer fixtures compile every applicable public subpath using:

- TypeScript 5.9, the minimum supported compiler line;
- TypeScript 6.0, the primary compiler line;
- `moduleResolution: bundler` and `moduleResolution: NodeNext` on both lines.

Node.js compatibility follows the upstream lifecycle rather than a permanently
pinned list:

- the oldest supported LTS line is the compatibility floor;
- the active LTS line is blocking;
- the current pre-LTS line is a non-blocking canary;
- EOL lines are removed from the matrix.

At adoption, Node 22 is the floor and release runtime, Node 24 is blocking, and
Node 26 is the canary. Updating numeric versions to follow this lifecycle does
not require a new ADR unless the policy itself changes.

## Rationale

Names and symbol kinds are stable enough for useful review without producing
large false-positive diffs from formatting or inferred-type changes. Compiling
real packed consumers with two TypeScript resolvers and compiler generations
covers declaration syntax and module-resolution compatibility that the snapshot
does not attempt to encode.

Two blocking Node LTS lines protect current consumers. A non-blocking current
line exposes upcoming incompatibilities early without allowing a pre-LTS
runtime to halt releases.

## Consequences

### Positive

- Accidental public surface drift becomes visible and attributable by package.
- Declaration consumers are exercised on both supported TypeScript generations.
- Node LTS compatibility is explicit and continuously tested.
- Canary failures provide migration time before the next Node line becomes LTS.

### Negative

- Intentional API additions require a reviewed baseline update.
- Compatibility CI performs additional full package builds on Node 24 and 26.
- Symbol-name snapshots do not prove semantic assignability of every signature.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Snapshot emitted declaration text | Noisy diffs from bundler layout and formatting |
| Snapshot inferred type strings | Unstable across TypeScript patch releases |
| Configure API Extractor for every subpath | High configuration and maintenance cost for 63 surfaces |
| Test only the release Node version | Misses supported LTS consumers and upcoming breakage |
| Make the current Node line blocking | Pre-LTS regressions could halt otherwise valid releases |
| Continue testing Node 20 | It reached EOL and no longer receives upstream security fixes |

## Open questions

- Whether stable packages should later add assignability fixtures for their most
  important generic contracts.
- When the Node 26 canary should become blocking as it enters LTS.

## References

- [ADR 0024 — Evidence-backed package graduation](./0024-package-graduation-evidence.md)
- [`docs/stability/public-api-v1.json`](../../stability/public-api-v1.json)
- [`scripts/check-packed-consumers.mjs`](../../../scripts/check-packed-consumers.mjs)
- [`scripts/check-public-api-snapshot.mjs`](../../../scripts/check-public-api-snapshot.mjs)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
