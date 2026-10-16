---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; pnpm e wrangler indisponíveis, comandos não executados; auditado em 2026-10-16"
fontes:
  - "apps/example-edge/package.json"
  - "apps/example-edge/README.md"
  - "apps/example-edge/src/worker.ts"
  - "apps/example-edge/wrangler.jsonc"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-edge

> [!tldr] Em linguagem comum
> AgentsKit rodando em Cloudflare Workers: um endpoint `POST /chat` que devolve a resposta do modelo em stream, com o caminho quente pequeno de propósito.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Worker de Cloudflare que demonstra o caminho quente de até 50 KB descrito na documentação de produção (`apps/example-edge/README.md:3`). O cabeçalho do arquivo lista o fluxo por requisição: fábrica `openai`, `createSource(...).stream()` e uma ponte para SSE (`apps/example-edge/src/worker.ts:1-19`). Não usa runtime, memória nem ferramentas (`apps/example-edge/src/worker.ts:16`). O pacote é privado (`apps/example-edge/package.json:2`).

## API e contratos

Não exporta API npm. Endpoints do Worker (`apps/example-edge/src/worker.ts:39-50`):

| Rota | Método | Resposta |
|---|---|---|
| `/health` | GET | `ok` (`:45`) |
| `/chat` | POST | Stream de eventos do provedor (`:48` valida método e caminho). Corpo: `{ messages: [{ role, content }] }` (`:29-31`). |
| qualquer outro | — | `404` (`:49`) |

Símbolo exportado: `default { fetch }` (`apps/example-edge/src/worker.ts:39`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/adapters` e `@agentskit/core` (`apps/example-edge/package.json:13-14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- Variáveis do Worker, recebidas por `env` (não por `process.env`): `OPENAI_API_KEY` (`apps/example-edge/src/worker.ts:25`), obrigatória, com resposta `500` se ausente (`:51`); e `OPENAI_MODEL` (`:26`), opcional. Configure-as como secrets do Worker; os valores não são copiados para a documentação.
- Rede: chama a API do provedor a cada requisição de `/chat`.
- CORS aberto para qualquer origem (`apps/example-edge/src/worker.ts:34`).

## Como mexer (para agentes)

- **Comece por:** `apps/example-edge/src/worker.ts`; a configuração de deploy está em `apps/example-edge/wrangler.jsonc`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-edge lint` (`tsc --noEmit`, `apps/example-edge/package.json:10`). O script `build` também é `tsc --noEmit` (`:9`). O script `dev` não inicia o Worker; só imprime a instrução `pnpm wrangler dev` (`:8`). Não executados nesta auditoria.
- **Armadilha:** não adicionar dependências ou módulos ao caminho quente sem medir o tamanho do bundle; o exemplo existe para mostrar esse orçamento.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado. A documentação de referência do caminho quente está em `docs/production/edge`, citada no README (`apps/example-edge/README.md:3`).
- Histórico recente (`git log --oneline -n 3 -- apps/example-edge`, conferido em 2026-10-16): `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `289d3ae8 chore(deps): bump minor/patch dependencies across the workspace (#1004)`, `230dd913 chore(deps): consolidated minor/patch dependabot updates (#916)`.

> [!info]- Detalhe técnico
> - `apps/example-edge/package.json:1` — manifesto, scripts (`:8` dev, `:9` build, `:10` lint) e dependências (`:13-14`).
> - `apps/example-edge/src/worker.ts:39` — `export default { fetch }`.
> - `apps/example-edge/src/worker.ts:25-26` — bindings `OPENAI_API_KEY` e `OPENAI_MODEL`.
