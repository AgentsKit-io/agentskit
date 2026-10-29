---
"@agentskit/tools": minor
---

Add opt-in `webSearch({ provider: 'parallel' })` backed by keyless Parallel Search MCP. `auto` selection and existing providers are unchanged; a selected Parallel failure is surfaced to the caller. Transport and auth can be supplied via `mcpClient`.
