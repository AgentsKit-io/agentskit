---
"@agentskit/cli": minor
---

Plugin loader (Phase 2 of ARCHITECTURE.md). Adds `config.plugins` (package specifiers or file paths), `--plugin-dir` CLI flag, and `~/.agentskit/plugins/` auto-discovery. Each plugin contributes `slashCommands`, `tools`, `skills`, `providers`, `hooks`, and `mcpServers` — the chat command merges them into its runtime registries. Failures in one plugin do not abort the CLI.
