# Conventions — `@agentskit/integrations`

Unified service-integration catalog: one descriptor per service, projected into
tools, connectors, triggers, and auth. Dependency-light — only `@agentskit/core`
plus runtime `fetch` / `node:crypto`. No vendor SDKs (ADR-0012). Stability:
**beta** (not stable).

## Scope

- **Contract** — `defineIntegration`, `defineAction`, `defineTrigger`, auth
  specs (`apiKey` / `oauth2` / `webhookSecret` / `none`), `CONFIG_FIELDS`
- **HTTP helpers** — `httpJson`, `bindHttp` (auth-bound, origin-confined client
  with automatic redirects disabled; `HttpToolOptions.signal` for cancellation)
- **Registry** — `createRegistry`, `registerIntegration`, `getIntegration`,
  `listIntegrations`, `integrationsByCategory`
- **Projections** — `toToolDefinitions`, `actionToToolDefinition`,
  `httpOptionsFor`, `integrationTools`, `integrationToolsFromEnv`,
  `credentialEnvVar`; `ProjectionConfig.signal` and `ProjectionConfig.fetchUntrusted`
- **Catalog services** under `src/services/<slug>/` (~50 fetch-only descriptors;
  side-effect registration into the default registry). Bundled per ADR-0012;
  OSS owns this surface per RFC 0003 (AKOS consumes, does not re-ship)
- **Testing subpath** — `@agentskit/integrations/testing` validators
  (`validateIntegration`, `validateAction`, `validateTrigger`, …)
- **Execution boundaries** — ADR-0026: origin-confined auth-bound HTTP; derived
  confirmation for `write` / `external` / `destructive`; host-injected
  `fetchUntrusted` for model-controlled URLs (Whisper fails closed without it;
  `@agentskit/tools` Whisper facade injects `safeFetch` independently of provider fetch)

## What does NOT belong here

- Vendor SDK clients or heavy runtime deps → stay out (HTTP/`fetch` only)
- Provider LLM adapters → `@agentskit/adapters`
- Browser UI / framework bindings
- MCP protocol transport → `@agentskit/tools` / `@agentskit/mcp`
- Host OAuth flow runners, token vaults, or product business logic
- AKOS control-plane concerns (egress edge, RBAC, multi-tenant) — see RFC 0003;
  hosts inject policy via `fetchUntrusted` / confirmation rather than embedding
  platform logic here

## Authoring a service

1. Prefer `pnpm gen:integration <name>` (copies `services/_template`).
2. One folder per slug: `src/services/<slug>/{index,actions,…}.ts`.
3. Actions use canonical JSON Schema; `execute` receives an auth-bound HTTP
   client and never sees raw credentials.
4. Declare `sideEffect` honestly (`none` | `read` | `write` | `destructive` |
   `external`) — projection forces confirmation for write/external/destructive.
5. Register via the service module side-effect; re-export through
   `src/services` so the default catalog stays complete.
6. Gate descriptors in CI with `@agentskit/integrations/testing`.
7. Model-controlled downloads use `ctx.fetchUntrusted` (never raw `fetch`);
   fail closed when the host did not inject a policy fetch.

## Constraints

- Named exports only on the TS surface.
- No bare `throw new Error` — use typed package errors / structured results.
- `_template` is generator source only; keep it out of coverage expectations
  (already excluded in vitest config).
- Do not bundle vendor SDKs.
- Do not claim `stable` — beta packages may still adjust surface in minors.

## Testing

- Unit-test contract helpers, registry, HTTP binding, and projections.
- Service descriptors should pass the testing-subpath validators.
- Configured line coverage threshold: **80** (with `src/services/_template/**`
  excluded).
- Cover origin confinement, signal propagation, confirmation derivation, and
  `fetchUntrusted` fail-closed paths when those surfaces change.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Importing a vendor SDK | Use `http` / `fetch` + documented REST paths |
| Putting credentials on the action surface | Bind auth in the HTTP client; actions get `http` only |
| Duplicating a tool in `@agentskit/tools` | Author once here; project with `toToolDefinitions` |
| Skipping `sideEffect` honesty | Match real blast radius so projection can gate correctly |
| Using raw `fetch` for model-controlled URLs | Require `fetchUntrusted`; document direct-consumer injection |
| Editing `_template` as a live service | Instantiate via `pnpm gen:integration` |

## Review checklist for this package

- [ ] Coverage threshold holds (80% lines; template excluded)
- [ ] New services validate via `@agentskit/integrations/testing`
- [ ] No vendor SDK dependencies added
- [ ] Auth stays declarative; credentials never land in action args
- [ ] Projections still produce valid `ToolDefinition` shapes
- [ ] Default registry registration remains side-effect complete
- [ ] Mutating actions receive derived confirmation; model URLs use `fetchUntrusted`
