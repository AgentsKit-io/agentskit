---
"@agentskit/cli": minor
---

Permission policy (Phase 4 of ARCHITECTURE.md). New `PermissionPolicy` with modes (`default` / `plan` / `acceptEdits` / `bypassPermissions`) and rules (`allow` / `ask` / `deny`, exact or regex). Applied when resolving the tool set for chat — denied tools are dropped, asked tools get `requiresConfirmation: true`, allowed tools run without confirmation. `--mode` CLI flag + `config.permissions` field.
