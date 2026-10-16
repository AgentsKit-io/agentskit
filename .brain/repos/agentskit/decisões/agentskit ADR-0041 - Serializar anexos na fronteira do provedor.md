---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0041-adapter-content-serialization.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0041 - Serializar anexos na fronteira do provedor

> [!tldr] Em linguagem comum
> Serializar anexos na fronteira do provedor. Ainda proposto, pronto para revisão do mantenedor. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: proposto (`proposed` na fonte; "implementation ready for maintainer review"). **Data**: não consta na fonte.

## Decisão em linguagem comum

Reuse the existing adapter and message contracts. Serialize parts in the shared
provider history encoders, preserving order and tool-call correlation. Parts are
authoritative when present. Unsupported modalities, source formats or disabled
image capability raise an adapter-local CAPABILITY_UNSUPPORTED error before I/O.
No core types or contracts change; text-only wire behavior remains unchanged.

Use the existing OpenAI stream transport for configurable path, headers and fetch
and for gateway presets. Authentication is optional and supplied headers override
defaults case-insensitively. Resolve catalog placeholders from explicit caller
values; never read environment credentials inside the library. No new dependency.

## Contexto

The existing Message contract contains ordered ContentPart arrays alongside a
legacy string projection. Native provider serializers read only the projection,
so advertising image capability does not ensure that an image reaches the wire.
OpenAI-compatible gateways also need configurable authentication and endpoint paths.

## Consequências

Não registrado na fonte.

## Pacotes afetados

- [[agentskit-adapters]], [[agentskit-core]] (`ContentPart`, `src/index.ts:37-55`).

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0041-adapter-content-serialization.md:1`
