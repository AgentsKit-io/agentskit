---
"@agentskit/cli": minor
---

Add `agentskit add <agent>` — pull a ready-made agent from the AgentsKit registry
(registry.agentskit.io) and copy its source into your project, shadcn-style. You
own the copied code. Resolves from the hosted index first, falling back to the
registry repo's raw GitHub source so it works before hosting is live.

Supports `--run "<task>"` to execute the agent immediately after adding it (e.g.
`npx agentskit add legal-contract-reviewer --run "review this NDA…" --provider ollama`).
The agent runs as data (its systemPrompt), never by executing the copied code —
no remote/local code execution. `--provider`/`--model`/`--api-key` select the
model; tool-composing agents (research/pr-review) print a use-as-library message.
