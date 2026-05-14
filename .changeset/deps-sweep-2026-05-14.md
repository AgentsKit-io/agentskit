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

- Pins `packages/ink` → `marked@^15` so the `marked-terminal@7.3.0` peer
  (`marked >=1 <16`) keeps resolving cleanly. Move to `marked@^18` once
  `marked-terminal` releases a compatible major.
- Bumps SHA-pinned GitHub Actions: `setup-node` v6.4.0, `upload-artifact`
  v7.0.1, `cache` v5.0.5, `dependency-review-action` v5.0.0,
  `codeql-action` v4.35.4.
