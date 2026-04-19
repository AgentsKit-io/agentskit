---
'@agentskit/tools': minor
'@agentskit/core': minor
---

Phase 3 sprint S20 — issues #167, #168.

- `@agentskit/tools/mcp` (new subpath) — bidirectional Model Context
  Protocol bridge. `createMcpClient` + `toolsFromMcpClient` consume
  any MCP server and expose its tools as native `ToolDefinition`s.
  `createMcpServer` exposes AgentsKit tools to MCP hosts.
  Transport-agnostic — ships `createStdioTransport` (newline-
  delimited JSON on stdin/stdout) and `createInMemoryTransportPair`
  for tests. Protocol subset: `initialize` + `tools/list` +
  `tools/call` over JSON-RPC 2.0.
- `@agentskit/core/compose-tool` (new subpath) — `composeTool` chains
  N `ToolDefinition`s into a single macro tool. Each step's
  `mapArgs` builds the next sub-call from accumulated state;
  `mapResult` transforms output; `stopWhen` short-circuits the
  chain. `finalize` reducer optional. Exposes one schema to the
  model but runs a fixed recipe.
