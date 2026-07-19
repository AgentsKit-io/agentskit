---
'@agentskit/react': minor
'@agentskit/vue': minor
'@agentskit/svelte': minor
'@agentskit/solid': minor
'@agentskit/react-native': minor
'@agentskit/angular': minor
---

Cross-framework binding stabilization wave for the shared `ChatReturn` surface (edit/regenerate parity, async Promise returns, deny reason, lifecycle teardown, streaming InputBar gates, a11y hooks).

`@agentskit/angular` now publishes partial-Ivy AOT/APF (ESM-only) via ng-packagr with a verified root export map; docs state Angular 18+ and AOT/APF truth. React Native docs require streaming polyfills that fail predictably when missing.

**Not a stable promotion.** Packages remain `beta`. The beta soak clock for promotion eligibility starts only after this minor line is released (`changeset version` + publish), then must complete the RFC 0004 soak window before any binding can claim stable.
