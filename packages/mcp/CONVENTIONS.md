# @agentskit/mcp conventions

- Composition package: the server bridge depends on `@agentskit/core` and
  `@agentskit/tools`; agent delegation and the CLI additionally compose
  `@agentskit/runtime` and `@agentskit/adapters`.
- Built on the official `@modelcontextprotocol/sdk` (exact pin). The SDK owns
  protocol framing, version negotiation, Streamable HTTP, and JSON-RPC dispatch;
  this package owns validation, confirmation, events, redaction, and Apps
  metadata.
- `@agentskit/tools/mcp` keeps the MCP client and the legacy hand-written
  server. The legacy server receives no new protocol features; new MCP server
  protocol work belongs in this package.
- `stdout` is reserved for the MCP JSON-RPC channel. Never write logs/diagnostics
  to stdout — use `stderr`.
- Tool names follow the MCP interoperability grammar: 1–128 ASCII letters,
  digits, `_`, `-`, or `.`, and must be unique within one server.
- Registry IDs are lowercase kebab-case and remote reads are abortable, timed,
  and byte-bounded. Remote source is data only and is never executed.
- CLI parsing fails closed for unknown, duplicate, or valueless flags. Shell,
  filesystem, and SQLite remain explicit opt-ins with their required scope.
- The package implements MCP tools, resources, and the Streamable HTTP
  transport. WebSocket, prompts, sampling, persistence, token issuance,
  authorization-server operation, and rate limiting remain host or transport
  responsibilities.
- `verifyBearer` requires an explicit absolute `resource`. Protected-resource
  metadata is served at the RFC 9728 path-suffixed well-known URL derived from
  `resource`; a resource without a path uses the root well-known URL.
- Named exports only. No bare throws — surface errors via `onEvent` / process exit.
- Maintain at least 95% line coverage across non-entrypoint modules.
