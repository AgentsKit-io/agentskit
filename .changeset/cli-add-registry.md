---
"@agentskit/cli": minor
---

Registry commands for ready-made agents (registry.agentskit.io):

- `agentskit add <agent>` — copy an agent's source into your project (shadcn-style;
  you own the code). Hosted index with raw-GitHub fallback. `--run "<task>"` runs it
  immediately (as data, never executing copied code); `--provider`/`--model`/`--api-key`.
- `agentskit diff <agent>` — show how your local copy differs from the current
  registry source (line-level diff).
- `agentskit update <agent>` — update your local copy to the registry source.

Lets users adopt an agent, own/edit it, and still pull upstream fixes.
