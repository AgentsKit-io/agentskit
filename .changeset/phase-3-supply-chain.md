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

Supply chain + repo hygiene (Phase 3 of #841):

- `"sideEffects": false` (or `["**/*.css"]` for `@agentskit/react`) on
  every publishable package so consumer bundlers can tree-shake unused
  modules.
- No runtime behaviour change.
