---
"@agentskit/cli": minor
---

MCP bridge (Phase 5 of ARCHITECTURE.md). Spawn MCP servers from `config.mcp.servers` (or `plugin.mcpServers`), list their tools via `tools/list`, and expose each as a `ToolDefinition` named `<server>__<tool>` whose `execute` forwards to `tools/call`. Line-delimited JSON-RPC transport. Clients disposed automatically on chat exit. `McpClient` is also exported for direct use.
