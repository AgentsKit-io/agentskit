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
fontes: ["agentskit/apps/example-multi-agent/package.json", "agentskit/apps/example-multi-agent/src/App.tsx"]
tags: [app, repo/agentskit]
---

# @agentskit/example-multi-agent

> [!tldr] Em linguagem comum
> Mostra uma simulação de planejamento e delegação na tela. O adaptador produz respostas prontas; não é execução real de vários agentes.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-react]], [[agentskit-skills]], `react`, `react-dom` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

Entradas nomeadas no código: `App`.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-multi-agent/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/example-multi-agent/src/App.tsx:1` — entrada de código e composição

> [!bug] Existe, mas ninguém usa
> Este exemplo não exercita delegação real de [[agentskit-runtime]]: `createMultiAgentDemoAdapter` simula as respostas.
