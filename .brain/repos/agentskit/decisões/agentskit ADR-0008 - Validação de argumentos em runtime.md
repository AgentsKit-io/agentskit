---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0008-runtime-validation.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0008 - Validação de argumentos em runtime

> [!tldr] Em linguagem comum
> Valida os argumentos das ferramentas em tempo de execução. Hoje o tipo só é convertido por cast, sem checagem (ver a seção de contexto).

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-06-03.

## Decisão em linguagem comum

1. **JSON Schema stays the single canonical schema format.** Core already standardises on `JSONSchema7` for tool, manifest, agent-schema, and security taxonomy. We do **not** introduce Zod as a parallel canonical.
2. **Validation is an injectable, opt-in capability.** Core exposes a `validateArgs?: ArgsValidator` hook with a **default passthrough** (current behaviour). No validator is bundled into core; the zero-dependency contract (`scripts/check-core-no-deps.mjs`) is preserved.
3. **An optional Ajv implementation** provides `createAjvValidator()` returning an `ArgsValidator` that checks parsed tool args against the tool's existing `JSONSchema7`. It is implemented in the private `@agentskit/validation` workspace package and published through `@agentskit/tools/validation`.
4. **Validation failure raises a typed error** `ToolError` with code `AK_TOOL_INVALID_INPUT`, carrying a safe field summary. It flows through the existing didactic error system.

## Contexto

Tool definitions carry a `JSONSchema7` (`packages/core/src/types/tool.ts`). `defineTool` infers the argument type from that schema at compile time — but it only **casts**: `return config as ToolDefinition<...>`. Nothing validates at runtime.

The real untrusted boundary in AgentsKit is **model output**, not application user input. A model returns a tool call whose `args` is an arbitrary JSON string. The runtime path is:

```
chunk.toolCall.args (string from LLM)
  → safeParseArgs()          // JSON.parse, returns {} on failure
  → execute(args)            // typed as InferSchemaType<TSchema> — but NEVER checked
```

`safeParseArgs` (`packages/core/src/primitives.ts:87`) guarantees the value is *an object*, nothing more. A model can omit required fields, send wrong types, or inject extra keys, and `execute` receives them while TypeScript believes the contract holds. Same gap on the inbound path via `adapter.parse(req)` (`packages/runtime/src/chat-trigger.ts`).

The Agents Playbook lists "typed boundaries — all external inputs validated by runtime schemas" as a non-negotiable, and separately lists "inline schemas → no single source of truth" as a failure mode.

## Consequências

- New public contract: `ArgsValidator` type + `validateArgs` option on the chat controller and runtime.
- Validation uses the existing `AK_TOOL_INVALID_INPUT` error code.
- Ajv remains outside core and is bundled into the opt-in `@agentskit/tools/validation` public subpath.
- Default behaviour unchanged: callers who do not pass a validator get today's passthrough. Documented as opt-in; turning it on is recommended for production.
- Inbound `adapter.parse(req)` validation is **out of scope** here; covered when an HTTP-surface ADR lands. Flagged in `docs/security/threat-model.md`.

## Pacotes afetados

- [[agentskit-core]], [[agentskit-runtime]], [[agentskit-validation]], [[agentskit-tools]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0008-runtime-validation.md:1`
