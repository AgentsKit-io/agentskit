---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/tools"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/tools/package.json", "packages/tools/src/index.ts", "apps/docs-next/content/docs/for-agents/tools.mdx", "AGENTS.md", "packages/tools/CONVENTIONS.md", "packages/tools/tests/discovery.test.ts", "packages/tools/tests/email.test.ts", "packages/tools/tests/fetch-url.test.ts", "packages/tools/tests/filesystem.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0004-retriever-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-tools

> [!tldr] Em linguagem comum
> Pacote tools do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/tools` publica a superfície definida em `packages/tools/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/tools.mdx` e limita edições a `packages/tools`. Fonte: `packages/tools/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.tools`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `webSearch` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:1` |
| `WebSearchConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:2` |
| `WebSearchProvider` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:2` |
| `WebSearchResult` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:2` |
| `fetchUrl` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:4` |
| `FetchUrlConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:5` |
| `safeFetch` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:7` |
| `checkEgress` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:7` |
| `isPrivateHost` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:7` |
| `isPrivateIPv4` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:7` |
| `isPrivateIPv6` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:7` |
| `EgressPolicy` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:8` |
| `filesystem` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:10` |
| `FilesystemConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:11` |
| `shell` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:13` |
| `ShellConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:14` |
| `listTools` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:16` |
| `defineZodTool` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:18` |
| `DefineZodToolConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:19` |
| `sqliteQueryTool` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:21` |
| `SqliteQueryConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:22` |
| `slackTool` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:24` |
| `SlackToolConfig` | export nomeado | API pública do pacote. | `packages/tools/src/index.ts:25` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { webSearch, filesystem, shell } from '@agentskit/tools'` — `packages/tools/README.md:54`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-integrations]], [[agentskit-net]] (`packages/tools/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/tools.mdx` (`.doc-bridge/index.json`, `handoffs.tools`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: AK_SHELL_TEST_SECRET, OPENAI_API_KEY, SERPER_API_KEY, SLACK_WEBHOOK_URL, TAVILY_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/tools.mdx`, `packages/tools/CONVENTIONS.md` e `packages/tools/src/index.ts`.
- **Raiz de edição do handoff:** `packages/tools` (`.doc-bridge/index.json`, `handoffs.tools`).
- **Invariantes:** | Side effects at import time (top-level `await`) | Move to `init()` or `execute()` (invariant T10) | (`packages/tools/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/tools/tests/discovery.test.ts`, `packages/tools/tests/email.test.ts`, `packages/tools/tests/fetch-url.test.ts`, `packages/tools/tests/filesystem.test.ts`, `packages/tools/tests/integrations-s22.test.ts`, `packages/tools/tests/integrations.test.ts`, `packages/tools/tests/mcp-devtools.test.ts`, `packages/tools/tests/mcp.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/tools test` e `pnpm --filter @agentskit/tools lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0008 - Validação de argumentos em runtime]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]], [[agentskit ADR-0026 - Limites de segurança na execução de integrações]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0035 - Poda da documentação e consolidação das rotas de referência da API]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]]. Histórico recente (`git log --oneline -15 -- packages/tools`):

- `e8d42064 chore: version packages (#1757)`
- `a4f3c023 feat(mcp): preserve tool metadata and expose confirmation hook (#1832)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `17d3a7fc fix(tools): bound provider response bodies (#1760)`
- `0743256f chore: version packages (#1753)`

> [!info]- Detalhe técnico
> - `packages/tools/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/tools/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/tools.mdx:1` — handoff documental de agentes.
> - `packages/tools/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
