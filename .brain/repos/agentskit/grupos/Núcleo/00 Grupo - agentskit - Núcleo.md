---
tipo: grupo
repo: agentskit
grupo: Núcleo
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "manifestos, fontes e índice .doc-bridge/index.json; CLI indisponível porque pnpm não está instalado"
fontes: ["packages/core/package.json", "packages/runtime/package.json", "packages/statechart/package.json", "packages/validation/package.json", "packages/net/package.json"]
tags: [grupo, repo/agentskit, camada/framework, grupo/nucleo]
---

# 00 Grupo - agentskit - Núcleo

> [!tldr] Em linguagem comum
> Este grupo reúne `@agentskit/core`, `@agentskit/runtime`, `@agentskit/statechart`, `@agentskit/validation`, `@agentskit/net` para cobrir uma área do toolkit.

← [[00 Hub - agentskit]]

## Responsabilidade

O grupo organiza pacotes por responsabilidade funcional e facilita a navegação para agentes. Cada pacote tem handoff, raízes de edição e checks no índice Doc Bridge versionado; os fatos da matriz foram conferidos nos manifests locais.

## Pacotes e relações internas

```mermaid
flowchart LR
  core[agentskit-core]
  runtime[agentskit-runtime]
  statechart[agentskit-statechart]
  validation[agentskit-validation]
  net[agentskit-net]
  runtime --> core
  runtime --> net
  validation --> core
  net --> core
```

| Nota | Pacote | Raiz |
|---|---|---|
| [[agentskit-core]] | `@agentskit/core` | `packages/core` |
| [[agentskit-runtime]] | `@agentskit/runtime` | `packages/runtime` |
| [[agentskit-statechart]] | `@agentskit/statechart` | `packages/statechart` |
| [[agentskit-validation]] | `@agentskit/validation` | `packages/validation` |
| [[agentskit-net]] | `@agentskit/net` | `packages/net` |

## Dependências de outros grupos

| Grupo | Relação |
|---|---|
| [[00 Grupo - agentskit - Núcleo]] | Contratos centrais usados por diversos pacotes do ecossistema. |
| [[00 Grupo - agentskit - Provedores e ferramentas]] | Fornece adaptadores, ferramentas e integrações quando declarado nos manifests. |
| [[00 Grupo - agentskit - Memória e RAG]] | Armazenamento e recuperação consumidos opcionalmente. |
| [[00 Grupo - agentskit - Interfaces]] | Bindings que conectam controladores às plataformas de UI. |
| [[00 Grupo - agentskit - Qualidade e observabilidade]] | Medição, observação e integrações de avaliação. |
| [[00 Grupo - agentskit - Ferramentas de desenvolvimento]] | CLI e templates para criação de projetos. |

## ADRs

Consulte [[00 Decisões - agentskit]] para contratos e decisões que afetam os pacotes deste grupo.

## Entradas para agentes

Para editar um pacote, abra sua nota, siga `startHere`, leia `CONVENTIONS.md` e execute os comandos `checks` do handoff. Os checks não foram executados neste ambiente porque `pnpm` está ausente. Registro do grupo: `.doc-bridge/index.json`.

> [!info]- Detalhe técnico
> Relações internas: dependências `@agentskit/*` encontradas nos manifests listados em `fontes`; detalhes dos contratos e exemplos estão nas notas individuais.
