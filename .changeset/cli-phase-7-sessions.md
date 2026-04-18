---
"@agentskit/cli": minor
---

Session polish (Phase 7 of ARCHITECTURE.md). New `/rename` and `/fork` slash commands, plus `renameSession` / `forkSession` exports. Session metadata now carries optional `label` and `forkedFrom`. `--list-sessions` prints the label alongside the id and notes forks. The interactive `SessionsApp` picker is a follow-up.
