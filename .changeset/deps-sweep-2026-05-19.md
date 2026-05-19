---
"@agentskit/adapters": patch
"@agentskit/angular": patch
"@agentskit/cli": patch
"@agentskit/core": patch
"@agentskit/eval": patch
"@agentskit/eval-braintrust": patch
"@agentskit/ink": patch
"@agentskit/memory": patch
"@agentskit/observability": patch
"@agentskit/observability-langfuse": patch
"@agentskit/rag": patch
"@agentskit/react": patch
"@agentskit/react-native": patch
"@agentskit/runtime": patch
"@agentskit/sandbox": patch
"@agentskit/skills": patch
"@agentskit/solid": patch
"@agentskit/svelte": patch
"@agentskit/templates": patch
"@agentskit/tools": patch
"@agentskit/vue": patch
---

Dependency sweep — bumps third-party deps (and dev deps) to latest
across all packages via `pnpm up -r --latest`. No public API changes.

- Adds pnpm override `postcss: ">=8.5.15"` to remediate the moderate
  PostCSS XSS advisory (GHSA-qx2v-qp2m-jg93) reaching the tree
  transitively through `next > postcss`. `pnpm audit` now clean.
- Keeps `packages/ink` on `marked@^15`: bumping to `marked@^18` breaks
  the `marked-terminal@7.3.0` peer (`marked >=1 <16`) and no compatible
  `marked-terminal` major exists yet.
- Bumped: fumadocs-ui/mdx/core, postcss, @types/node, motion, svelte,
  @cloudflare/workers-types, braintrust, solid-js, tsx.
