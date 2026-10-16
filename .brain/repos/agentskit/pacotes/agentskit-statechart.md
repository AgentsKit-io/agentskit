---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/statechart/package.json", "agentskit/packages/statechart/src/index.ts", "agentskit/packages/statechart/src/statechart.ts", "agentskit/packages/statechart/src/definition.ts", "agentskit/packages/statechart/src/snapshot.ts"]
npm: "@agentskit/statechart"
tags: [pacote, repo/agentskit]
---

# @agentskit/statechart

> [!tldr] Em linguagem comum
> Controla etapas e transições de uma interação por regras explícitas, sem pedir à IA que decida tudo. Permite salvar e restaurar o estado.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[chat]] |
| Depende de peças do ecossistema | Nenhuma dependência de produção/peer entre os workspaces inventariados. |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `createStatechartInstance, notifyStatechartObserver, transitionStatechart,`, `defineStatechart`, `restoreStatechart, serializeStatechart`, `STATECHART_SNAPSHOT_VERSION, StatechartDiagnosticCodes, StatechartError,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe eventos e estado; produz transições e snapshots serializáveis. O pacote não impõe persistência externa.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/statechart/package.json:1`.
> - Entrada e composição: `agentskit/packages/statechart/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/statechart/src/statechart.ts:42`.
> - Implementação exportada: `agentskit/packages/statechart/src/definition.ts:121`.
> - Implementação exportada: `agentskit/packages/statechart/src/snapshot.ts:45`.
