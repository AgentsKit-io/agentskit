---
tipo: app
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/apps/example-slack-bot/package.json", "agentskit/apps/example-slack-bot/src/index.ts", "agentskit/apps/example-slack-bot/src/adapter.ts"]
tags: [app, repo/agentskit]
---

# @agentskit/example-slack-bot

> [!tldr] Em linguagem comum
> Demonstra a ligação de mensagens Slack ao runtime com verificação de entrada e envio de respostas.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-core]], [[agentskit-runtime]] |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-slack-bot/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/example-slack-bot/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/apps/example-slack-bot/src/adapter.ts:66`.
