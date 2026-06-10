---
"@agentskit/cli": minor
---

Add `agentskit add <agent>` — pull a ready-made agent from the AgentsKit registry
(registry.agentskit.io) and copy its source into your project, shadcn-style. You
own the copied code; no new framework dependency. Resolves from the hosted index
first, falling back to the registry repo's raw GitHub source so it works before
hosting is live. e.g. `npx agentskit add research`.
