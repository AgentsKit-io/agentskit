---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0011-inbound-validation.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0011 - Inbound request validation (chat triggers)

> [!tldr] Em linguagem comum
> Inbound request validation (chat triggers).

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Accepted; - **Date**: 2026-06-03.

## Decisão em linguagem comum

**Add opt-in schema validation of the parsed event**, reusing the ADR-0008
contract. `ChatTriggerOptions` gains:

- `eventSchema?` — a `JSONSchema7` for the `ChatSurfaceEvent`
  (typed as `Parameters<ArgsValidator>[0]` to avoid adding a `json-schema`
  dependency to runtime).
- `validateEvent?` — an `ArgsValidator` (e.g. `createAjvValidator()` from
  `@agentskit/validation`).

When **both** are set, the trigger validates the event immediately after
`parse` (and the `null` check) and before `filter`/`agent.run`. On failure it
emits a `rejected` observer event and returns **HTTP 400** with the validator's
message. With neither (or only one) set, behaviour is unchanged — pure
passthrough, no new dependency pulled in.

## Contexto

`createChatTrigger` (`@agentskit/runtime`) turns inbound webhooks (Slack,
Discord, Teams, …) into agent runs. The pipeline is:

```
req → adapter.verify(req)   // signature + replay (required in strict mode)
    → adapter.parse(req)    // → ChatSurfaceEvent | null
    → agent.run(buildTask(event), buildContext(event))
```

`verify` authenticates the *sender*. But the parsed `ChatSurfaceEvent` shape was
trusted thereafter — a malformed or unexpected payload from a verified-but-buggy
source (or a surface whose adapter under-validates) reaches `agent.run`. That is
threat #8 in `docs/security/threat-model.md`. ADR-0008 already established
`ArgsValidator` + JSON Schema as the way AgentsKit validates untrusted input at
runtime; the inbound surface should reuse it rather than invent a second
mechanism.

## Consequências

- `ChatTriggerOptions` adds `eventSchema` + `validateEvent` (additive, minor).
- Invalid inbound events are rejected at the edge with 400 instead of reaching
  the agent.
- Validating the **raw request body** (pre-parse) is still the adapter's job;
  this ADR covers the normalized event. A raw-body schema can be layered later
  if a surface needs it.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0011-inbound-validation.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0011-inbound-validation.md:1`
