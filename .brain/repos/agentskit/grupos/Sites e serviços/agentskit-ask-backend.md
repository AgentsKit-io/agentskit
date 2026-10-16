---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; doc-bridge index versionado em .doc-bridge/index.json (generatedAt 2026-10-12) para inventário; pnpm indisponível, CLI não executada; auditado em 2026-10-16"
fontes:
  - "apps/ask-backend/package.json"
  - "apps/ask-backend/src/ask/handler.ts"
  - "apps/ask-backend/src/server.ts"
  - "apps/ask-backend/src/ask/remote-corpus.ts"
  - "apps/ask-backend/src/ask/handler.test.ts"
  - "apps/ask-backend/src/ask/cache.test.ts"
  - "apps/ask-backend/src/ask/remote-corpus.test.ts"
  - "rfcs/README.md"
  - "rfcs/0007-central-ask-backend.md"
  - "railway.json"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-ask-backend

> [!tldr] Em linguagem comum
> Serviço que responde perguntas sobre a documentação do AgentsKit com recuperação de trechos e citações. Roda como servidor e expõe o handler de pergunta.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Monta o serviço de perguntas: corpora, modelo, recuperação (`@agentskit/rag`), cache, limites de uso e rotas HTTP. O handler de pergunta é `createAskHandler(config)` (`apps/ask-backend/src/ask/handler.ts:183`); o servidor o cria por corpus, com adapter e limitador compartilhados (`apps/ask-backend/src/server.ts:194-197`). Na inicialização, o servidor exige `OPENROUTER_API_KEY` e encerra se ela não estiver definida (`apps/ask-backend/src/server.ts:37-39`). O workspace é privado e não é pacote npm (`apps/ask-backend/package.json:4`, nome `@agentskit/ask-backend` na linha 2).

A evolução para serviço persistente e multi-corpus está na proposta RFC-0007, ainda em estado `Proposed` (`rfcs/README.md:30`); a RFC não é ADR aceito.

## API e contratos

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createAskHandler` | `(config: AskConfig) => (req: Request) => Promise<Response>` | Cria o handler Web-standard que responde a uma pergunta. | `apps/ask-backend/src/ask/handler.ts:183` |

Uso real, no servidor, uma vez por corpus:

```ts
handlers[id] = createAskHandler({
```

Fonte: `apps/ask-backend/src/server.ts:197` (a configuração completa segue na linha seguinte; o formato de `AskConfig` está em `handler.ts`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências internas | `@agentskit/adapters`, `@agentskit/core`, `@agentskit/rag`, `@agentskit/tools` (`apps/ask-backend/package.json:14-17`) |
| Dependências externas | `@upstash/ratelimit` (`:19`), `@upstash/redis` (`:20`), `hono` (`:21`) |
| Consumidores | O widget Ask do registry chama o endpoint público padrão `https://ask.agentskit.io/v1/ask`, configurável por `NEXT_PUBLIC_ASK_ENDPOINT` (`apps/registry/components/ask-widget.tsx:138`; `apps/registry/.env.example`). Outros consumidores não foram verificados. |

## Dados e efeitos

- Lê o corpus local e corpora remotos por `fetch` (`apps/ask-backend/src/ask/remote-corpus.ts`).
- Chama o OpenRouter com a chave `OPENROUTER_API_KEY` (`apps/ask-backend/src/server.ts:37`).
- Cache e limite de uso podem usar Redis. Os nomes lidos são `REDIS_URL` (cache durável e limite), `ASK_REDIS_URL` (só limite) e `UPSTASH_REDIS_REST_URL` com `UPSTASH_REDIS_REST_TOKEN`; sem eles, o servidor usa memória (`apps/ask-backend/src/server.ts:13-14`). Os valores nunca são copiados para a documentação.
- Rotas HTTP: `/v1/search`, recuperação bruta sem LLM (`apps/ask-backend/src/server.ts:282`), e `/mcp`, endpoint JSON-RPC público e somente leitura da RFC-0007 (`apps/ask-backend/src/server.ts:329-338`).

## Como mexer (para agentes)

- **Comece por:** `apps/ask-backend/src/ask/handler.ts` (handler) e `apps/ask-backend/src/server.ts` (composição, variáveis de ambiente e corpora).
- **Testes:** `apps/ask-backend/src/ask/handler.test.ts`, `apps/ask-backend/src/ask/cache.test.ts` e `apps/ask-backend/src/ask/remote-corpus.test.ts`.
- **Validação:** `pnpm --filter @agentskit/ask-backend test` (executa `vitest run`, `apps/ask-backend/package.json:11`) e `pnpm --filter @agentskit/ask-backend lint` (`tsc --noEmit`, `apps/ask-backend/package.json:10`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Deploy:** configuração de Railway em `railway.json`. Ela não comprova qual host está ativo; confirme no workflow e no painel antes de concluir.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o app, mantenedores.

## Decisões e história

- RFC-0007 (`rfcs/0007-central-ask-backend.md`) propõe a forma persistente e multi-corpus; estado `Proposed` em `rfcs/README.md:30`. Não é ADR aceito.
- Histórico recente (`git log --oneline -n 3 -- apps/ask-backend`, conferido em 2026-10-16): `c7f19deb Add public npm downloads dashboard (#1840)`, `109488c8 chore: audit dead deps and align Node engines (#1783)`, `e832c06d fix(docs): route Ask through ZDR-capable models (#1752)`.

> [!info]- Detalhe técnico
> - `apps/ask-backend/package.json:1` — manifesto, dependências e scripts.
> - `apps/ask-backend/src/ask/handler.ts:183` — `createAskHandler` (a linha 4 é apenas o comentário de documentação).
> - `apps/ask-backend/src/server.ts:37-39` — exigência de `OPENROUTER_API_KEY`.
> - `apps/ask-backend/src/server.ts:13-14` — variáveis de Redis (nomes).
> - `rfcs/README.md:30` — status de RFC-0007.
