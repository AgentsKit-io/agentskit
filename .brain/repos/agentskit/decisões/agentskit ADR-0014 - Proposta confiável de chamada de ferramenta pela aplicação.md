---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0014-trusted-tool-call-proposal.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação

> [!tldr] Em linguagem comum
> Proposta de chamada de ferramenta pela aplicação, com identificador idempotente: repetir o mesmo id devolve a mesma chamada. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-07-11.

## Decisão em linguagem comum

Add `proposeToolCall` to `ChatController` and every framework `ChatReturn`, plus the equivalent tree-shakeable helper at `@agentskit/core/tool-proposal`. It accepts a canonical tool-call id, registered tool name, and parsed arguments.

The controller requires the tool to exist, expose an execute function, opt into `requiresConfirmation`, and pass the configured `ArgsValidator` when a schema is present. A valid proposal appends one canonical assistant tool call in `requires_confirmation` state and returns it without executing.

Proposal ids are idempotency keys. Reusing an existing id returns the existing call without changing its identity, arguments, status, or result. `approve` and `deny` remain the only continuation paths.

The canonical call is committed before `onToolCall`, matching model-originated calls and reserving the id against concurrent or reentrant proposals. If that hook rejects, the call transitions to terminal `error`, the proposal promise rejects, and later approval cannot execute it.

All framework bindings expose the same additive method. The controller lazy-loads the implementation while retaining exclusive access to its current tool map, validator, and `onToolCall` hook. This preserves the strict 10 KB default core budget; consumers pay the implementation cost only when they invoke the proposal capability.

## Contexto

The chat controller already owns tool argument validation, confirmation state, approval, denial, and execution. Trusted application UI can initiate an action outside a model stream, but the public controller has no supported way to place that action into the existing confirmation lifecycle.

Without a core seam, framework integrations must inject message state, encode hidden prompts, or create a parallel tool executor.

## Consequências

- Trusted apps can enter the same confirmation lifecycle as model-produced calls.
- No additional executor or validator is introduced.
- The additive method slightly increases the core public surface and bundle size.
- Authorization, token binding, expiry, audit, and application policy remain outside core.

## Pacotes afetados

- [[agentskit-core]], [[agentskit-integrations]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0014-trusted-tool-call-proposal.md:1`
