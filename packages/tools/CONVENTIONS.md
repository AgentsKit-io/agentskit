# Conventions — `@agentskit/tools`

Ready-made tools that satisfy the Tool contract ([ADR 0002](../../docs/architecture/adrs/0002-tool-contract.md)).

## Scope

- General-purpose tools: web search, filesystem, shell, discovery helpers
- Provider integrations plus MCP and validation subpaths, exposed behind this package's facade
- Factory functions (`webSearch()`, `filesystem({ basePath })`, `shell({ allowedCommands })`) that return `ToolDefinition` or arrays of them
- Small surface helpers used by multiple tools — only if truly shared

## Ownership boundaries

- Provider integrations are owned by `@agentskit/tools/integrations` and keep their provider-neutral contracts here.
- Tool execution sandboxes remain in `@agentskit/sandbox`.
- MCP client/server/devtools live under `@agentskit/tools/mcp*`; host transports and authentication remain host-owned.
- Runtime argument validation is implemented in `@agentskit/tools/validation` and injected into core or MCP.

## Adding a new tool

1. Create `src/<tool-name>.ts`.
2. Export a factory function (not a raw `ToolDefinition`) so users can pass configuration: `webSearch({ apiKey })`, `filesystem({ basePath })`.
3. The factory returns `ToolDefinition` or `ToolDefinition[]` (for tools that come as a group, like filesystem read/write/list).
4. Define the JSON Schema 7 as a typed object literal. No Zod in this package (see `zod-to-json-schema` in consumer projects if they prefer Zod).
5. Include a concise `description` — this is what the model reads.
6. Set `requiresConfirmation: true` for any destructive operation. Non-negotiable.
7. Return **JSON-serializable** data from `execute` — Dates become ISO strings, Buffers become base64.
8. Throw `ToolError` for rejected input, provider failures, and missing optional peers; keep messages safe at remote boundaries.
9. Re-export from `src/index.ts`.

## Naming

- Tool names match the factory name: `webSearch()` → `{ name: 'web_search' }`, `filesystem()` → `{ name: 'filesystem_read' }`, etc.
- Use snake_case for `name` (matches every major provider's convention and the JSON Schema ecosystem).
- Keep names short — the model sees them repeatedly.

## Testing

- Mock the external I/O (fetch, fs, child_process). Test only the tool's shape and dispatch logic.
- Test schema validation: passing a malformed args object should produce a tool error, not an execute call.
- Test confirmation flow when `requiresConfirmation: true`.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Returning a Buffer or Date directly | Serialize: base64 or ISO string |
| Forgetting `requiresConfirmation` on a destructive op | Default to true; reviewers flag this |
| Side effects at import time (top-level `await`) | Move to `init()` or `execute()` (invariant T10) |
| Tool names with spaces or hyphens in positions the regex rejects | Match `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$` |
| Shared state between tools (globals) | Encapsulate in the factory closure |

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (70% lines)
- [ ] Every new tool has its own schema validation test
- [ ] Destructive tools set `requiresConfirmation: true`
- [ ] `execute` returns JSON-serializable data only
- [ ] Factory accepts configuration; no hardcoded secrets
