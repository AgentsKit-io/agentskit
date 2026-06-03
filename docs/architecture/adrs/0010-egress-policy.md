# ADR 0010 — Network egress policy (safeFetch)

- **Status**: Accepted
- **Date**: 2026-06-03
- **Supersedes**: —
- **Related issues**: —

## Context

Tools act on model output, and some fetch URLs the model can influence
(`fetchUrl`, web tooling). Without a guard, a model — or a prompt-injection
payload — can point a request at internal infrastructure: cloud metadata
(`169.254.169.254`, `metadata.google.internal`), the loopback interface, or
RFC1918 services. That is server-side request forgery (SSRF), threat #6 in
`docs/security/threat-model.md`.

`fetchUrl` already implemented strong SSRF protection, but the logic lived
inline in one tool. There was no shared, default-deny wrapper that every tool
(and third-party tool authors) could route outbound HTTP through.

## Decision

**1. A single egress wrapper, default-deny.** `@agentskit/tools` exports
`safeFetch(input, init?, policy?)` — `fetch` that:
- allows `http`/`https` only;
- blocks private/loopback/link-local/CGNAT hosts and known cloud-metadata names
  by default (IPv4 + IPv6, including IPv4-mapped);
- resolves hostnames via `node:dns/promises` and **fails closed** when DNS is
  unavailable (e.g. edge runtime);
- follows redirects manually and **re-gates every hop** (redirect-based SSRF);
- throws `ToolError` (`AK_TOOL_INVALID_INPUT`) when blocked.

Companion primitives are exported for reuse: `checkEgress`, `isPrivateHost`,
`isPrivateIPv4`, `isPrivateIPv6`, and the `EgressPolicy` type.

**2. Opt-out, not opt-in, for model-controlled URLs.** Tools that fetch a
model-supplied URL must go through `safeFetch`/`checkEgress`. Overrides
(`allowPrivateHosts`, `allowedHosts`) exist for vetted internal targets and must
be set explicitly. `fetchUrl` now delegates to `checkEgress`.

**3. Where it lives.** The wrapper sits in `@agentskit/tools`, not `@agentskit/core`:
it needs `node:dns` (would break browser/edge core bundles) and core is at its
10 KB budget (ADR-0009, Manifesto principle 1). `EgressPolicy` is a tools-level
contract today; promote to core only if a non-tools package needs it.

**4. Out of scope.** Provider adapter endpoints are developer-configured (not
model-controlled) and are lower risk; they are not forced through `safeFetch`.
Centralised egress for adapters can follow if a need appears.

## Rationale

Centralising one audited implementation removes the risk of each new tool
re-implementing (or forgetting) SSRF defences. Default-deny + fail-closed means
the safe path is the path of least resistance. Keeping it in `tools` respects
the zero-dep, browser-safe core.

## Consequences

- New public exports from `@agentskit/tools`: `safeFetch`, `checkEgress`,
  `isPrivateHost`, `isPrivateIPv4`, `isPrivateIPv6`, `EgressPolicy`.
- `fetchUrl` behaviour is unchanged (same error strings; tests green) but now
  shares the egress logic.
- Tool authors fetching model-influenced URLs should use `safeFetch`.

## Alternatives considered

- **Put `safeFetch` in core.** Rejected: `node:dns` breaks browser/edge bundles
  and core has no size headroom.
- **New `@agentskit/net` package.** Rejected as premature: the only consumers
  today are tools; a separate package adds install ceremony. Revisit if adapters
  or other packages need it (then promote the contract to core per ADR-0009).
- **Leave the logic inline in `fetchUrl`.** Rejected: no reuse; the next tool
  repeats or omits the defence.

## References

- `packages/tools/src/safe-fetch.ts`, `fetch-url.ts`
- `docs/security/threat-model.md` (threat #6)
- ADR-0009 (composition rules), ADR-0008 (injection-point precedent)
