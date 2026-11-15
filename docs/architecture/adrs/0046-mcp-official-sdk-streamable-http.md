# ADR 0046 — MCP bridge on the official SDK, with remote Streamable HTTP, OAuth-protected resource and MCP Apps

- Status: Accepted
- Date: 2026-11-15
- Supersedes: protocol-ownership bullet of [ADR 0028](./0028-mcp-beta-boundaries.md)
- Related issues: #2006

## Context

ADR 0028 kept MCP protocol framing and request handling in
`@agentskit/tools/mcp`, with `@agentskit/mcp` acting as a thin composition
bridge over an injected transport. That boundary made sense when the bridge only
needed the tools subset over stdio.

MCP has since added protocol revisions, Streamable HTTP, OAuth-protected
resources (RFC 9728), and MCP Apps. Reimplementing each revision by hand in
`@agentskit/tools/mcp` would duplicate an actively maintained wire contract and
would delay support for transports and metadata that hosts already expect. The
bridge also needs to accept Web `Request`/`Response` so the same server can run
on Node.js, Cloudflare Workers, Deno, and Bun.

## Decision

- The server bridge in `@agentskit/mcp` is built on the official
  `@modelcontextprotocol/sdk`, pinned exactly at `1.32.2`. The SDK owns protocol
  framing, version negotiation, Streamable HTTP, and JSON-RPC dispatch.
- `@agentskit/mcp` keeps the AgentsKit-owned policy layer: tool-name validation
  and uniqueness, argument validation, confirmation authorization, observer
  isolation, redacted errors, annotations/title/`_meta` passthrough, and
  `ui://` resource exposure.
- The default stdio path connects the same SDK server to
  `createStdioTransport(processStdio())`. `createStreamableHttpHandler` exposes
  a stateless Streamable HTTP handler over Web `Request`/`Response`.
- `@agentskit/tools/mcp` keeps its MCP client and its hand-written server. The
  server is legacy: it remains for existing consumers and direct transport
  users, receives no new protocol features, and is not the path used by
  `@agentskit/mcp`. Delegating it to the new bridge is rejected because
  `@agentskit/tools` cannot depend on `@agentskit/mcp` without a dependency
  cycle.
- With `verifyBearer`, `resource` is required. The handler returns `401` with an
  RFC 9728 `WWW-Authenticate` challenge and serves protected-resource metadata at
  the path-suffixed well-known URL derived from `resource`. Verified identities
  reach tools as `context.auth`.
- MCP Apps are exposed as `ui://` resources with
  `text/html;profile=mcp-app`; tools link to them through
  `_meta.ui.resourceUri` (or the `app` shorthand).
- `@agentskit/core` remains unchanged and dependency-free.

## Rationale

Protocol mechanics are a moving external contract. Using the official SDK keeps
version negotiation and transport behavior correct without maintaining a second
stack, while the AgentsKit layer continues to own the safety and validation
decisions that are specific to this project. Keeping the legacy server in
`@agentskit/tools/mcp` avoids a dependency cycle and preserves existing
consumers; the client remains useful independently of either server.

## Consequences

- Protocol revisions, Streamable HTTP, and MCP Apps arrive through the SDK
  rather than through new hand-written JSON-RPC handlers.
- `@agentskit/mcp` gains a runtime dependency on the official SDK. The exact pin
  makes upgrades deliberate and reviewable.
- The protocol-ownership bullet of ADR 0028 is superseded; its validation,
  observability, CLI, and registry boundaries still apply.
- `@agentskit/tools/mcp` has two server paths during the transition: the legacy
  server for existing consumers and the SDK-backed bridge in `@agentskit/mcp`.
  Documentation must not present the legacy server as the recommended path.
- Hosts remain responsible for token issuance, authorization-server operation,
  rate limiting, and confirmation UI.

## Alternatives considered

- **Keep all MCP server logic in `@agentskit/tools/mcp`.** Rejected because it
  would require reimplementing Streamable HTTP, protocol revisions, and Apps
  metadata, and would keep the bridge coupled to a second stack.
- **Move the tools client into `@agentskit/mcp` and delete the tools server.**
  Rejected as a breaking change outside this decision; the client is usable on
  its own and existing consumers may depend on the legacy server.
- **Delegate the legacy server to `@agentskit/mcp`.** Rejected because
  `@agentskit/tools` cannot depend on `@agentskit/mcp` without a cycle.
- **Accept unverified bearer tokens and let hosts enforce access.** Rejected
  because the handler must not advertise a protected resource it cannot verify.

## Open questions

- When to deprecate and remove the legacy server in `@agentskit/tools/mcp`.
- Whether to add stateful Streamable HTTP sessions or server-side event stores.

## Verification

- `pnpm --filter @agentskit/mcp test` covers initialize/list/call over a real
  Streamable HTTP client, bearer challenges, path-suffixed metadata, explicit
  metadata paths, `context.auth`, annotations, `ui://` resources, and
  confirmation denial.
- `pnpm --filter @agentskit/tools test` keeps the legacy client and server
  suite green.
- `pnpm --filter @agentskit/mcp build` and `pnpm --filter @agentskit/mcp lint`
  verify the published dual ESM/CJS surface and strict types.
- `node scripts/check-doc-index.mjs` keeps this ADR linked from the index.

## References

- [ADR 0028 — MCP bridge beta boundaries](./0028-mcp-beta-boundaries.md)
- [ADR 0002 — Tool contract](./0002-tool-contract.md)
- [ADR 0009 — Composition and dependency rules](./0009-composition-rules.md)
- [RFC 9728 — OAuth 2.0 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728)
- [MCP specification](https://modelcontextprotocol.io/specification)
- [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps)
