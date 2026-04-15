# Conventions — `@agentskit/observability`

Observers and integrations for logging, tracing, and metric emission. Pairs with the `Observer` primitives in `@agentskit/core`.

## Stability tier: `beta`

Observer shape is stable; provider integrations (LangSmith, OpenTelemetry, PostHog, console) are growing. Breaking changes to integrations may land in minor bumps.

## Scope

- **Console observer** — default local-dev logger
- **Provider integrations** — LangSmith, OpenTelemetry, PostHog (as they land)
- **Tracing helpers** — span wrappers, trace-id generation

## Observers are read-only

Per runtime RT9: observers **cannot** mutate messages, tool calls, or results. Side effects (log, metric emission, trace span) are fine; state mutation is not.

If you're tempted to write an observer that rewrites a tool call or redacts a prompt, it's not an observer — it's a wrapper runtime. Build it as such.

## Adding a new observer

1. Create `src/<name>.ts`.
2. Export a factory: `export function consoleObserver(opts): Observer`.
3. Implement only the events you care about — all observer methods are optional.
4. Catch and log observer-internal errors. Never throw out of an observer — the runtime swallows it but you lose context.
5. Re-export from `src/index.ts`.

## Adding a provider integration

1. Create `src/integrations/<provider>.ts`.
2. Export a factory that returns an `Observer`.
3. Accept configuration at construction (`apiKey`, `projectId`, etc.).
4. Batch if the provider requires it; don't block the runtime on network calls.
5. Document the provider-specific fields used from `chunk.metadata`.

## Testing

- Observers are tested via a mock runtime that fires events and asserts observer side effects.
- Do not reach out to real provider APIs in unit tests. Mock the HTTP client or SDK.
- Integration tests against real providers run separately and are not blocking.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Mutating a message or result in an observer | Wrap the runtime; observers are read-only |
| Blocking the runtime on slow API calls | Fire-and-forget with batching |
| Throwing on missing optional fields | Check for presence; metadata is opaque |
| Logging at every chunk in production | Sample or aggregate |

## Review checklist for this package

- [ ] Bundle size under 10KB gzipped
- [ ] Coverage threshold holds (55% lines, climbing)
- [ ] Observer does not mutate any runtime state
- [ ] Errors caught and logged, never thrown out
- [ ] Provider integration documented in package README
