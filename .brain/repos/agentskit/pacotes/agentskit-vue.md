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
fontes: ["agentskit/packages/vue/package.json", "agentskit/packages/vue/src/index.ts", "agentskit/packages/vue/src/useChat.ts", "agentskit/packages/vue/src/ChatContainer.ts", "agentskit/packages/vue/src/components.ts"]
npm: "@agentskit/vue"
tags: [pacote, repo/agentskit]
---

# @agentskit/vue

> [!tldr] Em linguagem comum
> Liga o controlador comum de conversa ao Vue, com estado reativo e componentes de interface.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-core]], `vue` |
| Usado por (produção/peer nestes dois repos) | [[chat]], [[chat-vue]], [[chat-example-vue]] |

Manifesto permite distribuição npm; a versão publicada não foi consultada.

## O que entrega

Subpaths do manifesto: `.`.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit/packages/vue/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/packages/vue/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/vue/src/useChat.ts:15`.
> - Implementação exportada: `agentskit/packages/vue/src/ChatContainer.ts:13`.
> - Implementação exportada: `agentskit/packages/vue/src/components.ts:10`.
