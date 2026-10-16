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
fontes: ["agentskit/apps/ask-backend/package.json", "agentskit/apps/ask-backend/src/server.ts"]
tags: [app, repo/agentskit]
---

# @agentskit/ask-backend

> [!tldr] Em linguagem comum
> É o serviço comum que responde perguntas sobre materiais do ecossistema com fontes. Mantém busca e modelos aquecidos e atende vários sites.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-rag]], [[agentskit-tools]], `@hono/node-server`, `@upstash/ratelimit`, `@upstash/redis`, `hono`, `redis` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Lê índices, fontes e mensagens; consulta IA e recuperação; mantém cache em memória e, se configurado, Redis ou Upstash. Credenciais ficam no servidor.

> [!info]- Detalhe técnico
> - `agentskit/apps/ask-backend/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/ask-backend/src/server.ts:1` — entrada de código e composição

## Infra e divergência

Railway executa o servidor Hono persistente via Docker. O README sugere `build`, mas o manifesto do app declara `dev`, `start`, `lint` e `test`, sem `build`. Ver [[AgentsKit - Pergunta com fontes]].
