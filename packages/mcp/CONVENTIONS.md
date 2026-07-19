# @agentskit/mcp conventions

- Composition package: the server bridge depends on `@agentskit/core` and
  `@agentskit/tools`; agent delegation and the CLI additionally compose
  `@agentskit/runtime` and `@agentskit/adapters`.
- Bridges, never reimplements: wraps `createMcpServer` / `createStdioTransport`
  from `@agentskit/tools/mcp`. New MCP protocol logic belongs in `tools`, not here.
- `stdout` is reserved for the MCP JSON-RPC channel. Never write logs/diagnostics
  to stdout — use `stderr`.
- Tool names follow the MCP interoperability grammar: 1–128 ASCII letters,
  digits, `_`, `-`, or `.`, and must be unique within one server.
- Registry IDs are lowercase kebab-case and remote reads are abortable, timed,
  and byte-bounded. Remote source is data only and is never executed.
- CLI parsing fails closed for unknown, duplicate, or valueless flags. Shell,
  filesystem, and SQLite remain explicit opt-ins with their required scope.
- The package implements the MCP tools subset. HTTP, WebSocket, resources,
  prompts, sampling, persistence, access control, and rate limiting remain host
  or transport responsibilities.
- Named exports only. No bare throws — surface errors via `onEvent` / process exit.
- Maintain at least 95% line coverage across non-entrypoint modules.
