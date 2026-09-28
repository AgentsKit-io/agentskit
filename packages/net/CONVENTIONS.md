# Conventions — `@agentskit/net`

The single owner of HTTP plumbing for the AgentsKit ecosystem (ADR-0037):
retries with backoff and `Retry-After`, per-attempt timeouts, bounded body
reads, SSE parsing and SSRF address checks. Adapters, tools and ecosystem
repositories import from here instead of hand-rolling retry loops and
`data:` line splitting.

## Scope

- **Retry** — `retry`, `computeBackoff`, `parseRetryAfter`, `isRetryableStatus`.
- **Fetch** — `fetchWithRetry` over any `fetch` implementation.
- **Timeouts** — `timeoutSignal`, `anySignal`.
- **Bodies** — `readBody` / `readText` / `readJson` with a byte cap.
- **SSE** — `parseSSE` / `parseSSEResponse` over `eventsource-parser`.
- **Addresses** — `classifyAddress`, `isPublicAddress`, `assertPublicUrl` over `ipaddr.js`.

## What does NOT belong here

- Provider-specific request/response shapes → `@agentskit/adapters`
- Process spawning, paths, filesystem → `@agentskit/cross-platform`
- Auth, credential storage, rate-limit accounting per tenant

## Implementation constraints

- Web platform APIs only (`fetch`, `Response`, `ReadableStream`,
  `AbortSignal`). No `node:` imports: the package runs on Node, Bun, Deno,
  browsers and edge runtimes. DNS resolution is injected (`lookup`).
- Named exports only; typed errors (`NetError`, `AK_NET_*`).
- Reuse libraries first: `eventsource-parser`, `ipaddr.js`. `eventsource-parser`
  is bundled because it ships ESM only.
- Never retry a request whose body is a stream, and never retry
  non-idempotent methods unless the caller opts in.

## Testing

- Unit tests (vitest) inject `fetch`, `random` and `lookup`; no network.
- Coverage floor 90% lines, with `src/fetch.ts` and `src/address.ts` critical.
