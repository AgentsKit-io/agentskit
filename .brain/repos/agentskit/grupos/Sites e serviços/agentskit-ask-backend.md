---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "doc-bridge index versionado em .doc-bridge/index.json (gerado em 2026-10-12) para inventário/relacionamentos; pnpm indisponível, CLI não executada; inspeção estática no commit 9b31c771"
fontes:
  - "apps/ask-backend/package.json"
  - "apps/ask-backend/src/ask/handler.ts"
  - "apps/ask-backend/src/server.ts"
  - "apps/ask-backend/src/ask/remote-corpus.ts"
  - "rfcs/README.md"
  - "rfcs/0007-central-ask-backend.md"
  - "railway.json"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-ask-backend

> [!tldr] Em linguagem comum
> Serviço persistente que responde perguntas sobre documentação com recuperação e citações.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Entrada Hono compõe corpora, modelos, retrieval, cache, limites e rotas HTTP/MCP; exige `OPENROUTER_API_KEY` ao iniciar. [apps/ask-backend/src/ask/handler.ts:4].

## API e contratos

O workspace é privado e não publica API npm; o contrato observável é a superfície de app abaixo.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createAskHandler` | (config: AskConfig) => (req: Request) => Promise<Response> | Composição principal | `apps/ask-backend/src/ask/handler.ts:4` |

Exemplo real: `createAskHandler(config)` — `apps/ask-backend/src/ask/handler.ts:4`.

## Quem usa e do que depende

Usado por sites; depende de core, adapters, rag, tools, Hono e Redis/Upstash.

| Relação | Evidência |
|---|---|
| Dependências declaradas no manifesto | `apps/ask-backend/package.json:1` |

## Dados e efeitos

Lê corpus local e corpora remotos via fetch; chama OpenRouter; cache/rate limits podem usar `REDIS_URL`, `ASK_REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, com fallback em memória.

## Como mexer (para agentes)

- Entrada: `apps/ask-backend/src/ask/handler.ts`.
- Invariantes: preserve os limites entre demo e integração real e os contratos usados.
- Testes: handler, cache, remote-corpus e cache-integrity em `apps/ask-backend/src/ask/*.test.ts`.
- Validação: `pnpm --filter @agentskit/ask-backend test`.
- Armadilha: comandos de build/deploy configurados não comprovam o destino atualmente ativo; confira o manifesto e o workflow do app.
- Revisão: owners em `.github/CODEOWNERS`; sem regra específica, mantenedores.

## Decisões e história

- A composição do backend identifica RFC-0007 está em estado Proposed (`rfcs/README.md:30`); não é ADR aceito. A proposta descreve a forma persistente e multi-corpus. Consulte `rfcs/0007-central-ask-backend.md:1`.
- Histórico recente (git log --oneline -15 -- apps/ask-backend): 2026-10-13 · c7f19deb · painel público de downloads npm; 2026-10-03 · 109488c8 · auditoria de dependências e engines; 2026-10-02 · e832c06d · roteia Ask para modelos compatíveis com ZDR.

> [!info]- Detalhe técnico
> Manifesto e scripts: `apps/ask-backend/package.json:1`; símbolo: `apps/ask-backend/src/ask/handler.ts:4`. O índice Doc Bridge versionado foi usado para contexto de documentação e relações, mas não pôde ser atualizado porque pnpm não está disponível.
