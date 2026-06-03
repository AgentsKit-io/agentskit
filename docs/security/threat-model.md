# Threat Model

Scope: the AgentsKit **library** as consumed by a developer's application.
AgentsKit ships no hosted service, so the trust boundary is the consuming app
plus the external systems agents talk to. This model is reviewed per release and
populated iteratively (Agents Playbook: empty structure day one, fill over time).

## Assets

- **API keys / provider credentials** — OpenAI/Anthropic/etc. keys, MCP server
  tokens, tool credentials (Resend, Telegram, calendar).
- **End-user data in transit** — chat messages, retrieved documents, tool args
  and results, memory contents (may contain PII).
- **Execution capability** — tool execution and sandboxed code execution run on
  behalf of model output.
- **Supply chain integrity** — published npm packages and their dependency tree.

## Actors

- **Honest developer** — integrates the library; trusted, may misconfigure.
- **End user** — interacts with the built agent; semi-trusted input source.
- **The model** — produces tool calls and content; **untrusted output**: may
  hallucinate, be prompt-injected, or emit malformed/hostile args.
- **External services** — provider APIs, MCP servers, tool endpoints; untrusted
  responses.
- **Supply-chain attacker** — targets dependencies or the publish pipeline.

## Attack surface

Model output → tool-call dispatch (`safeParseArgs` → `execute`); inbound request
parsing (`adapter.parse`); outbound network from tools; MCP transports;
sandboxed code; memory/vector stores; the npm publish path.

## Threats × mitigations

| # | Threat | Mitigation | Status |
|---|---|---|---|
| 1 | Model emits malformed/hostile tool args; `execute` trusts them | Opt-in runtime validation against the tool's JSON Schema → `AK_TOOL_INVALID_INPUT` (ADR-0008, `@agentskit/validation`) | shipped (opt-in) |
| 2 | Prompt injection steers the agent | Injection heuristics + taxonomy (`packages/core/src/security/injection.ts`, `taxonomy.ts`); human-in-the-loop confirmation (`requiresConfirmation`) | shipped |
| 3 | PII leaks into logs/traces/model context | PII detection + regional routing (`security/pii.ts`); redaction in observability | shipped |
| 4 | Secrets hard-coded or logged | Vault references (`security/vault.ts`); no secrets in errors (typed error system carries codes/hints, not internals) | shipped |
| 5 | Runaway cost / abuse | Rate limiting (`security/rate-limit.ts`); `maxToolIterations`, budget/cost-guard (`observability`) | shipped |
| 6 | Unbounded tool egress (SSRF, exfiltration) | Tools own their network; **default-deny `safeFetch` egress wrapper is not yet centralized** | gap — tracked |
| 7 | Sandbox escape via model code | E2B isolation, timeouts, no network by default (`@agentskit/sandbox`) | shipped |
| 8 | Inbound `adapter.parse(req)` accepts malformed requests | Schema validation of inbound requests | gap — out of scope of ADR-0008; HTTP-surface ADR pending |
| 9 | Compromised dependency | `dependency-review`, CodeQL, pinned actions, `pnpm` overrides for advisories; changeset-gated releases | shipped |
| 10 | Auth/tenancy confusion (multi-tenant consumers) | SSO/SAML helpers (`security/sso.ts`); tenancy is the consuming app's responsibility | partial |

## Known gaps (operate-phase, deferred)

Audit ledger, key-rotation calendar, signed-artifact attestation, incident
runbooks, and centralized default-deny egress belong to a hosted/app surface and
are intentionally out of scope for the library today. Revisit when a managed
runtime ships. See [[project_playbook-alignment]] in `.agent-memory/`.

_Last reviewed: 2026-06-03._
