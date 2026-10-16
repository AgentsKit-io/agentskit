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
fontes: ["agentskit/packages/angular/package.json", "agentskit/packages/angular/src/index.ts", "agentskit/packages/angular/src/components.ts"]
npm: "@agentskit/angular"
tags: [pacote, repo/agentskit]
---

# @agentskit/angular

> [!tldr] Em linguagem comum
> Liga o controlador comum de conversa à interface em Angular. Entrega componentes e acesso ao estado sem criar outro motor de agente.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[chat-angular]], [[chat]] |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | `tslib`, `@angular/core`, `rxjs` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `AgentskitChat`, `ChatContainerComponent, MessageComponent, InputBarComponent, MarkdownComponent, CodeBlockComponent, ToolCallViewComponent, ThinkingIndicatorComponent, ToolConfirmationComponent,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê e apresenta mensagens e eventos; o estado, ferramentas e persistência vêm da sessão/controlador e das opções do hospedeiro.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/angular/package.json:1`.
> - Entrada e composição: `agentskit/packages/angular/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/angular/src/components.ts:23`.
