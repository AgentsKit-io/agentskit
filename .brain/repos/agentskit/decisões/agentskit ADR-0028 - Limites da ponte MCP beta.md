---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0028-mcp-beta-boundaries.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0028 - Limites da ponte MCP beta

> [!tldr] Em linguagem comum
> MCP bridge beta boundaries.

← [[00 Decisões - agentskit]]

## Status e datas

- Status: Accepted; - Date: 2026-07-17.

## Decisão em linguagem comum

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

## Contexto

`@agentskit/mcp` exposes AgentsKit tools and optional delegated agents to MCP hosts. Its alpha surface mixed a thin programmatic bridge, an untested CLI, registry network reads, and broad provider composition. It also documented transport and server APIs that were not implemented. Beta requires an explicit, testable boundary without reimplementing the protocol owned by `@agentskit/tools/mcp`.

MCP tool metadata crosses a model-controlled boundary. Tool-name collisions reduce interoperability; malformed CLI flags can silently enable the wrong behavior; unbounded registry reads can hang or exhaust memory; and observer failures must not corrupt the JSON-RPC channel.

## Consequências

- Previously accepted invalid or duplicate tool names now fail during construction in a new `0.x` minor.
- Hosts remain responsible for authentication, authorization, confirmation UI, rate limiting, persistence, and custom network transports.
- The package does not claim built-in HTTP/WebSocket, resources, prompts, sampling, or the entire MCP feature set.
- Provider and registry catalogs can evolve without expanding the root server contract.
- With adversarial tests, package evidence, and honest documentation aligned, the package graduates from alpha to beta. Stable promotion still requires published-minor, soak, compatibility, evidence, and dependency gates.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0028-mcp-beta-boundaries.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0028-mcp-beta-boundaries.md:1`
