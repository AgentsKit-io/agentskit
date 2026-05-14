---
"@agentskit/core": patch
---

Phase 4 architecture cleanup (#841):

- Extract `mergeSystemMessages` and `buildRetrievalMessage` from
  `controller.ts` into `controller-helpers.ts` so they can be tested in
  isolation. No public API change.
- New CI guard `scripts/check-core-no-deps.mjs` fails the build if
  `@agentskit/core` ever grows a runtime `dependencies` block — the
  zero-dependency invariant is now enforced rather than aspirational.
