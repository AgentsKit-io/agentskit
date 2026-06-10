# @agentskit/mcp conventions

- Composition package: depends on `@agentskit/core` and `@agentskit/tools` only.
- Bridges, never reimplements: wraps `createMcpServer` / `createStdioTransport`
  from `@agentskit/tools/mcp`. New MCP protocol logic belongs in `tools`, not here.
- `stdout` is reserved for the MCP JSON-RPC channel. Never write logs/diagnostics
  to stdout — use `stderr`.
- Named exports only. No bare throws — surface errors via `onEvent` / process exit.
