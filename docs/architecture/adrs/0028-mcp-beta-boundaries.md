# ADR 0028 — MCP bridge beta boundaries

- Status: Accepted
- Date: 2026-07-17
- Supersedes: —
- Related issues: —

## Context

`@agentskit/mcp` exposes AgentsKit tools and optional delegated agents to MCP hosts. Its alpha surface mixed a thin programmatic bridge, an untested CLI, registry network reads, and broad provider composition. It also documented transport and server APIs that were not implemented. Beta requires an explicit, testable boundary without reimplementing the protocol owned by `@agentskit/tools/mcp`.

MCP tool metadata crosses a model-controlled boundary. Tool-name collisions reduce interoperability; malformed CLI flags can silently enable the wrong behavior; unbounded registry reads can hang or exhaust memory; and observer failures must not corrupt the JSON-RPC channel.

## Decision

- The package implements and documents the MCP tools subset over stdio or an injected `McpTransport`. Protocol framing and request handling remain owned by `@agentskit/tools/mcp`.
- Published tool names are unique and follow the MCP recommendation of 1–128 ASCII letters, digits, underscore, hyphen, or dot.
- Server construction validates tools, transport shape, and server metadata with existing typed AgentsKit configuration diagnostics, then snapshots the tool list and top-level definition fields. Nested schemas remain trusted tool-owned configuration.
- Observer callbacks are isolated. Synchronous throws and returned-thenable rejections cannot alter protocol behavior or become unhandled rejections.
- Agent tools validate their identity, prompt, description, adapter, safe step count, and non-empty byte-bounded task. Invalid task input uses `AK_TOOL_INVALID_INPUT`.
- Registry IDs are restricted before URL construction. Hosted JSON and raw fallback reads are abortable, timed, byte-bounded, shape-validated, and never executed.
- CLI parsing is separated from the bin entrypoint and fails closed for unknown, duplicate, missing-value, or invalid flags. Privileged filesystem, SQLite, and shell tools require explicit configuration; shell additionally requires `--allow-shell`.
- `stdout` remains exclusively the JSON-RPC channel. Help, lifecycle messages, and bounded error summaries use `stderr` and never echo credentials or private failure values.
- The root server bridge composes Core and Tools. Optional agent delegation and the bundled CLI additionally compose Runtime and Adapters; this dependency boundary is explicit rather than hidden.
- Default `serverInfo` identifies bridge contract generation `1.0.0` independently of npm patch releases; callers can override it.

## Rationale

Keeping protocol mechanics in Tools prevents two MCP implementations from drifting. Exact wrapper validation and a testable CLI close the package-owned failure modes. Bounded remote reads and non-execution of registry source preserve the convenience fallback without turning a registry response into code. Decoupling server identity from npm patches avoids wire metadata churn on unrelated releases.

## Consequences

- Previously accepted invalid or duplicate tool names now fail during construction in a new `0.x` minor.
- Hosts remain responsible for authentication, authorization, confirmation UI, rate limiting, persistence, and custom network transports.
- The package does not claim built-in HTTP/WebSocket, resources, prompts, sampling, or the entire MCP feature set.
- Provider and registry catalogs can evolve without expanding the root server contract.
- With adversarial tests, package evidence, and honest documentation aligned, the package graduates from alpha to beta. Stable promotion still requires published-minor, soak, compatibility, evidence, and dependency gates.

## Alternatives considered

- **Implement a second full MCP stack here.** Rejected because Tools already owns protocol framing and request handling.
- **Keep permissive CLI parsing.** Rejected because silent typos are unsafe around filesystem and shell capabilities.
- **Execute downloaded registry source.** Rejected because remote source is an untrusted data boundary.
- **Advertise unimplemented HTTP and WebSocket listeners.** Rejected in favor of the existing injected transport contract.
- **Remove agent delegation to preserve a two-dependency package.** Rejected because the shipped feature is useful and its Runtime/Adapters composition can be explicit and tested.

## Open questions

- Whether future public demand warrants separate packages for network transports or async agent-task execution.

## References

- [MCP tools specification, revision 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [ADR 0002 — Tool contract](./0002-tool-contract.md)
- [ADR 0009 — Composition and dependency rules](./0009-composition-rules.md)
- [ADR 0024 — Evidence-backed package graduation](./0024-package-graduation-evidence.md)
