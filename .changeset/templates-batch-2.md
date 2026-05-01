---
'@agentskit/cli': minor
---

feat(cli): three new starter templates:

- `expo` (#470) — Expo Router app with `expo-secure-store` token persistence and a mobile chat screen scaffolded against an injected adapter.
- `deno-deploy` (#472) — `Deno.serve` + `deployctl deploy` task + `npm:` imports for the AgentsKit packages.
- `angular` (#474) — Angular 21 standalone bootstrap with Signals, ready for the `@agentskit/angular` binding.

All three hook into the existing interactive picker and `--template` flag.
