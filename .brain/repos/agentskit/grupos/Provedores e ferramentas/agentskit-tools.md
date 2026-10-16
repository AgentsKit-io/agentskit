---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/tools"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores e de variáveis de ambiente por git grep; auditado em 2026-10-16"
fontes: ["packages/tools/package.json", "packages/tools/src/index.ts", "packages/tools/src/web-search.ts", "packages/tools/src/zod.ts", "packages/tools/tsup.config.ts", "packages/tools/README.md", "apps/docs-next/content/docs/for-agents/tools.mdx", "AGENTS.md", "packages/tools/CONVENTIONS.md", "packages/tools/tests/discovery.test.ts", "packages/tools/tests/safe-fetch.test.ts", "packages/tools/tests/shell.test.ts", "packages/tools/tests/web-search.test.ts", "packages/tools/tests/zod.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0010-egress-policy.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-tools

> [!tldr] Em linguagem comum
> Ferramentas prontas que um agente pode usar: busca na web, leitura de URL, arquivos, comando de shell com lista de permitidos, consulta SQLite, Slack e um helper para criar ferramenta a partir de esquema. Também reúne as integrações, o MCP e a validação de argumentos, expostos como subcaminhos do mesmo pacote.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/tools` reúne ferramentas que cumprem o contrato de ferramenta (ADR 0002) (`packages/tools/CONVENTIONS.md:3`). Ele cuida de ferramentas gerais e expõe, como subcaminhos, as integrações de fornecedor, o MCP e a validação (`CONVENTIONS.md:7-8`). A execução sandbox fica em `@agentskit/sandbox`, e o transporte e a autenticação do MCP ficam com o host (`CONVENTIONS.md:14-17`). O pacote está em beta (`packages/tools/package.json:96-98`).

## API e contratos

Exports de `packages/tools/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `webSearch` (+ `WebSearchConfig`, `WebSearchProvider`, `WebSearchResult`) | função e tipos | Busca na web; provedores Serper e Tavily (ver Dados e efeitos) | `src/index.ts:1-2` (`src/web-search.ts`) |
| `fetchUrl` (+ `FetchUrlConfig`) | função e tipo | Lê o conteúdo de uma URL | `src/index.ts:4-5` |
| `safeFetch`, `checkEgress`, `isPrivateHost`, `isPrivateIPv4`, `isPrivateIPv6` (+ `EgressPolicy`) | funções e tipo | Requisição com política de saída, bloqueando hosts privados | `src/index.ts:7-8` (`src/safe-fetch.ts`) |
| `filesystem` (+ `FilesystemConfig`) | função e tipo | Ferramentas de arquivo limitadas a `basePath` | `src/index.ts:10-11` |
| `shell` (+ `ShellConfig`) | função e tipo | Comando de shell limitado por `allowedCommands` | `src/index.ts:13-14` |
| `listTools` | função | Descoberta de ferramentas | `src/index.ts:16` |
| `defineZodTool` (+ `DefineZodToolConfig`) | função e tipo | Cria ferramenta a partir de um esquema tipo Zod, sem depender do pacote `zod` (`src/zod.ts:5`) | `src/index.ts:18-19` |
| `sqliteQueryTool` (+ `SqliteQueryConfig`) | função e tipo | Consulta SQLite; `better-sqlite3` é peer opcional | `src/index.ts:21-22` |
| `slackTool` (+ `SlackToolConfig`) | função e tipo | Ferramenta de Slack | `src/index.ts:24-25` |

Subcaminhos publicados (`packages/tools/package.json:37-56`): `./mcp`, `./integrations`, `./mcp-devtools` e `./validation`. O subcaminho `./validation` é gerado a partir de `packages/validation/src/index.ts` (`packages/tools/tsup.config.ts:11`).

Exemplo real (README do pacote, `packages/tools/README.md:54`; mesmo import em `packages/tools/fixtures/readme-quickstart.ts:3`):

```ts
import { webSearch, filesystem, shell } from '@agentskit/tools'
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-integrations]] e [[agentskit-net]] (`packages/tools/package.json:73-76`) |
| Dependência externa | `ajv` ^8.20.0 (`packages/tools/package.json:77`), usado pelo subcaminho de validação |
| Peer opcional | `better-sqlite3` (`packages/tools/package.json:88-95`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/tools.mdx` (`.doc-bridge/index.json`, `handoffs.tools`) |
| Consumidores dentro do repo | 5 manifestos declaram `@agentskit/tools` (busca em `packages` e `apps`, commit `9f8d8551`): `apps/ask-backend`, `apps/docs-next`, `packages/adapters` (dependência de desenvolvimento), `packages/cli` e `packages/mcp`. `apps/ask-backend/src/server.ts:24` importa `createAjvValidator` de `@agentskit/tools/validation`. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Rede: `web-search.ts:2` e `safe-fetch.ts:2` importam de `@agentskit/net`; `safeFetch` aplica a política de saída (`packages/tools/tests/safe-fetch.test.ts`, `packages/tools/tests/safe-fetch-dns.test.ts`; ADR 0010). `fetchUrl` não importa `@agentskit/net` diretamente (não verificado como ele faz a requisição).
- Variáveis de ambiente lidas em código:
  - `SERPER_API_KEY` (`packages/tools/src/web-search.ts:240`) e `TAVILY_API_KEY` (`:243`). Chave passada explicitamente tem prioridade sobre a variável de ambiente (`:240`, operador `??`).
  - `SLACK_WEBHOOK_URL` aparece só no exemplo de JSDoc de `slackTool` (`packages/tools/src/slack.ts:27`); o código não o lê diretamente.
- Arquivos e processos: `filesystem` opera dentro de `basePath`, e `shell` executa só comandos de `allowedCommands` (`CONVENTIONS.md:9`). Os testes correspondentes estão em `tests/filesystem.test.ts` e `tests/shell.test.ts`.

## Como mexer (para agentes)

- **Comece por:** `packages/tools/src/index.ts` (superfície pública), `packages/tools/CONVENTIONS.md` (regras) e a ferramenta que você quer alterar (`src/<nome>.ts`).
- **Raiz de edição do handoff:** `packages/tools` (`.doc-bridge/index.json`, `handoffs.tools`).
- **Invariantes** (`packages/tools/CONVENTIONS.md:19-29`, `:43-51`):
  - Ferramenta destrutiva define `requiresConfirmation: true`. Não é opcional (`:26`).
  - `execute` devolve só dados serializáveis em JSON: `Date` vira texto ISO, `Buffer` vira base64 (`:27`).
  - Entrada rejeitada, falha de provedor e peer ausente lançam `ToolError`, com mensagens seguras em fronteira remota (`:28`).
  - Schema em JSON Schema 7 escrito como objeto literal; não adicionar dependência de Zod (`:24`).
  - Nenhum efeito colateral ao importar o módulo (top-level `await` proibido, invariante T10, `:49`).
  - Fábricas recebem configuração; nenhum segredo fixo no código (`:60`).
- **Testes:** `packages/tools/tests/` (20 arquivos, entre eles `discovery`, `filesystem`, `fetch-url`, `safe-fetch`, `safe-fetch-dns`, `shell`, `web-search`, `zod`, `mcp`, `mcp-devtools`, `integrations`, `slack`, `teams`, `sqlite-query`). Os testes simulam I/O externo (`CONVENTIONS.md:39`).
- **Validação do pacote:** `pnpm --filter @agentskit/tools test` (`packages/tools/package.json:67`, roda build do turbo e `vitest run`) e `pnpm --filter @agentskit/tools lint` (`:69`, `tsc --noEmit`). Cobertura de linhas: 70% (`CONVENTIONS.md:56`); bundle abaixo de 15 KB gzip (`:55`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Integrações em tools são shims:** os serviços migrados para `@agentskit/integrations` continuam em `packages/tools/src/integrations/*.ts` como reexportações `@deprecated` (ex.: `slack.ts:10`, `gmail.ts:5`, `teams.ts:19`). Edite o descritor em `@agentskit/integrations`, não o shim. `CONVENTIONS.md:14` já diz que a integração pertence a `@agentskit/tools/integrations` com contratos neutros de fornecedor; o código atual aponta para o pacote novo. Ver a Dúvida abaixo.

> [!question] Dúvida: dono da camada de integrações
> `CONVENTIONS.md:14` diz que as integrações pertencem a `@agentskit/tools/integrations`, mas os descritores estão em `@agentskit/integrations` e `packages/tools/src/integrations/*` é só shim `@deprecated`. Confirmar com o time qual é o dono e se os shims serão removidos.
- **Armadilhas** (`CONVENTIONS.md:45-51`): devolver `Buffer` ou `Date` direto; esquecer `requiresConfirmation` em operação destrutiva; efeito no import; estado global compartilhado entre ferramentas (encapsular na closure da fábrica).

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0008 - Validação de argumentos em runtime]] (subcaminho `validation`), [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]], [[agentskit ADR-0026 - Limites de segurança na execução de integrações]], [[agentskit ADR-0028 - Limites da ponte MCP beta]] e [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]].

Histórico recente (`git log --oneline -15 -- packages/tools`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `a4f3c023 feat(mcp): preserve tool metadata and expose confirmation hook (#1832)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `17d3a7fc fix(tools): bound provider response bodies (#1760)`

> [!info]- Detalhe técnico
> - `packages/tools/package.json:1` — manifesto, versão, dependências, subcaminhos e scripts.
> - `packages/tools/src/index.ts:1` — entrada pública.
> - `packages/tools/src/web-search.ts:240` — leitura de `SERPER_API_KEY` e `TAVILY_API_KEY`.
> - `packages/tools/src/zod.ts:5` — contrato mínimo de Zod, sem dependência do pacote `zod`.
> - `apps/docs-next/content/docs/for-agents/tools.mdx:1` — handoff documental de agentes.
> - `packages/tools/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
