# ADR 0037 — One package owns HTTP plumbing

- **Status**: Proposed
- **Date**: 2026-09-28
- **Related ADRs**: ADR 0010, ADR 0036

## Context

A review of the ecosystem found the same HTTP helpers written many times,
each with its own bugs:

| Concern | Copies | Divergences |
| --- | --- | --- |
| Retry + `Retry-After` | `adapters`, `integrations`, `observability`, `os-core` | different retryable statuses; `observability` ignores `Retry-After`; two copies without jitter |
| Timeout / abort | 7+ promise-race `withTimeout` helpers | most abandon the promise instead of aborting the work |
| Bounded body reads | 10+ (`integrations`, `rag`, `tools`, `mcp`, `memory`, satellites) | some skip the `Content-Length` precheck or fall back to `response.text()` |
| SSE parsing | `adapters` and 3+ in agentskit-os | `adapters` requires `data: ` with a space and drops multi-line data |
| SSRF / private addresses | `tools/safe-fetch` plus 5+ in agentskit-os | some block lists miss RFC 1918, CGNAT, `fc00::/7` and IPv4-mapped IPv6 |

## Decision

Add `@agentskit/net` (beta) as the single owner of these helpers:

1. **Web APIs only** — `fetch`, `Response`, `ReadableStream`, `AbortSignal`.
   No `node:` imports, so one entry works on Node, Bun, Deno, browsers and
   edge runtimes. DNS resolution is injected into `assertPublicUrl`.
2. **Retry** — `retry` and `fetchWithRetry` with exponential backoff and full
   jitter, `Retry-After` (seconds or HTTP date, capped), retryable statuses
   `408, 425, 429, 500, 502, 503, 504`, idempotent methods by default, and
   per-attempt timeouts. Streaming request bodies are never retried.
3. **Bodies** — `readBody` / `readText` / `readJson` with a byte cap.
4. **SSE** — `parseSSE` over `eventsource-parser` (bundled; it ships ESM only).
5. **Addresses** — `classifyAddress` / `isPublicAddress` / `assertPublicUrl`
   over `ipaddr.js`.
6. Typed errors: `NetError extends AgentsKitError` with `AK_NET_*` codes.

`@agentskit/core` stays zero-dependency; the helpers are too large for its
budget.

## Consequences

- Consumers migrate separately: first the AgentsKit packages listed above,
  then `os-core/http` delegates and the satellites adopt.
- `tools/safe-fetch` keeps its policy surface (ADR 0010) and can delegate
  address classification here.
- Checking an address before connecting does not stop DNS rebinding; callers
  that need that guarantee pin the resolved address.
