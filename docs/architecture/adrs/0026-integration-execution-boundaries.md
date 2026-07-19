# ADR 0026 — Integration execution safety boundaries

- Status: Accepted
- Date: 2026-07-16
- Supersedes: —
- Related: ADR 0002, ADR 0010, ADR 0012

## Context

`@agentskit/integrations` projects one service descriptor into executable agent
tools. Its shared HTTP client binds credentials before an action runs, while a
raw `fetch` remains available for provider transports that are not JSON. Three
boundaries were previously implicit:

- an action could resolve an auth-bound request path onto another origin;
- mutating actions depended on each descriptor manually setting confirmation;
- the Whisper action downloaded a model-controlled URL through raw `fetch`, but
  `safeFetch` lives in `@agentskit/tools`, which already depends on
  `@agentskit/integrations`.

Moving `safeFetch` or adding the reverse dependency would either contradict ADR
0010 or create a package cycle. Duplicating its SSRF logic would create two
security implementations that could drift.

## Decision

**1. Auth-bound HTTP clients are origin-confined.** When `baseUrl` is configured,
`httpJson` accepts relative or same-origin absolute URLs only. It rejects a
cross-origin absolute or protocol-relative path before transport. Bound headers
win case-insensitively over per-request headers, and automatic redirects are
disabled so custom authentication headers cannot cross origins on a redirect.

**2. Cancellation and transport errors are explicit.** `HttpToolOptions.signal`
is composed with the request timeout and is propagated by `ProjectionConfig`.
Raw network and response-body failures become typed `ToolError` values while
existing typed errors and abort errors retain their identity.

**3. Confirmation follows impact.** Projection forces confirmation for actions
classified as `write`, `external`, or `destructive`. `none` and `read` remain
unconfirmed unless the descriptor explicitly requests confirmation. A descriptor
cannot opt a mutating action out by setting `requiresConfirmation: false`.

**4. Model-controlled egress uses an injected port.**
`IntegrationActionContext.fetchUntrusted` and
`ProjectionConfig.fetchUntrusted` carry a host-provided, policy-enforcing fetch.
Raw `fetch` remains the provider transport. An action that needs to retrieve a
model-controlled URL must fail closed when `fetchUntrusted` is absent.

The deprecated Whisper facade in `@agentskit/tools` injects `safeFetch` into this
port by default, independently of its provider `fetch`. A caller that needs a
custom audio transport supplies `fetchUntrusted` explicitly. A direct
`@agentskit/integrations` consumer must inject its own egress-policy fetch. This
preserves the dependency direction and keeps one SSRF implementation.

## Consequences

- Auth credentials cannot be redirected by an action to a different origin.
- All catalog mutations receive the same autonomy gate without per-service
  duplication.
- Direct Whisper consumers gain an explicit migration requirement: provide
  `fetchUntrusted`; the `@agentskit/tools` compatibility facade is safe by
  default.
- The integration contract gains additive cancellation and egress injection
  points. As a beta package, further contract changes remain minor-version
  events until stable graduation.

## Alternatives considered

- **Duplicate `safeFetch` in integrations.** Rejected because security fixes
  could drift between packages.
- **Depend on tools from integrations.** Rejected because tools already depends
  on integrations.
- **Move `safeFetch` to core.** Rejected by ADR 0010: DNS and Node dependencies
  violate the core portability and size contract.
- **Continue using raw fetch for model URLs.** Rejected because it violates the
  default-deny egress policy.

## References

- `packages/integrations/src/http.ts`
- `packages/integrations/src/project/to-tool-definitions.ts`
- `packages/integrations/src/services/whisper/actions.ts`
- `packages/tools/src/safe-fetch.ts`
- `packages/tools/src/integrations/whisper.ts`
