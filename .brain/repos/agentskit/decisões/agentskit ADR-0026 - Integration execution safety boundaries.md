---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0026-integration-execution-boundaries.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0026 - Integration execution safety boundaries

> [!tldr] Em linguagem comum
> Integration execution safety boundaries.

← [[00 Decisões - agentskit]]

## Status e datas

- Status: Accepted; - Date: 2026-07-16.

## Decisão em linguagem comum

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

## Contexto

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

## Consequências

- Auth credentials cannot be redirected by an action to a different origin.
- All catalog mutations receive the same autonomy gate without per-service
  duplication.
- Direct Whisper consumers gain an explicit migration requirement: provide
  `fetchUntrusted`; the `@agentskit/tools` compatibility facade is safe by
  default.
- The integration contract gains additive cancellation and egress injection
  points. As a beta package, further contract changes remain minor-version
  events until stable graduation.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0026-integration-execution-boundaries.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0026-integration-execution-boundaries.md:1`
