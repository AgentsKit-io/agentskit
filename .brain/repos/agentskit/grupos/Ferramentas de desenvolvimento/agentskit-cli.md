---
tipo: pacote
repo: agentskit
grupo: Ferramentas de desenvolvimento
npm: "@agentskit/cli"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/cli/package.json", "packages/cli/src/index.ts", "packages/cli/src/providers.ts", "packages/cli/src/doctor.ts", "packages/cli/src/resolve.ts", "packages/cli/src/extensibility/rag/runner.ts", "packages/cli/src/extensibility/mcp/client.ts", "packages/cli/tests/fixtures/readme-quickstart.ts", "apps/docs-next/content/docs/for-agents/cli.mdx", "AGENTS.md", "packages/cli/CONVENTIONS.md", "packages/cli/tests/ai.test.ts", "packages/cli/tests/chat-app.test.tsx", "packages/cli/tests/commands-chat.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/ferramentas-de-desenvolvimento]
---

# agentskit-cli

> [!tldr] Em linguagem comum
> Ferramenta de linha de comando do AgentsKit: cria projetos, roda um agente, abre um chat no terminal, executa diagnóstico (`doctor`), inicia o modo de desenvolvimento com recarga e expõe um túnel. Reúne a maior parte dos pacotes do ecossistema.

← [[00 Grupo - agentskit - Ferramentas de desenvolvimento]]

## O que faz e por que existe

Pacote da CLI `agentskit`. Sua entrada exporta `createCli` (criação do programa de comandos) e as operações que os comandos usam: `ChatApp` e `renderChatHeader` (chat no terminal), `writeStarterProject` (projeto inicial), `runAgent`, `runDoctor`, `startDev`, `startTunnel`, além de sessões, plugins, MCP, telemetria de custo, RAG, hooks e permissões (`packages/cli/src/index.ts:1-79`). Depende de onze pacotes do ecossistema: `adapters`, `core`, `cross-platform`, `ink`, `integrations`, `memory`, `net`, `rag`, `runtime`, `skills` e `tools` (`packages/cli/package.json:52-62`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/cli.mdx` e limita edições a `packages/cli` (`.doc-bridge/index.json`, `handoffs.cli`).

## API e contratos

Exports de `packages/cli/src/index.ts`, agrupados pela ordem do arquivo:

| Símbolos | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createCli` | função | Monta o programa de comandos da CLI. | `packages/cli/src/index.ts:1` |
| `loadConfig`, `AgentsKitConfig`, `LoadConfigOptions` | função e tipos | Carrega a configuração do projeto. | `packages/cli/src/index.ts:2-3` |
| `ChatApp`, `renderChatHeader`, `ChatCommandOptions` | componente, função e tipo | Chat interativo no terminal. | `packages/cli/src/index.ts:4`, `:7` |
| `writeStarterProject`, `InitCommandOptions`, `StarterKind` | função e tipos | Cria um projeto inicial. | `packages/cli/src/index.ts:5`, `:8` |
| `resolveChatProvider`, `ChatProviderOptions`, `ResolvedChatProvider` | função e tipos | Resolve o provedor de modelo a partir das opções e do ambiente. | `packages/cli/src/index.ts:6`, `:9` |
| `runAgent`, `RunCommandOptions` | função e tipo | Executa um agente. | `packages/cli/src/index.ts:10-11` |
| `runDoctor`, `renderReport`, `CheckResult`, `CheckStatus`, `DoctorOptions`, `DoctorReport` | funções e tipos | Diagnóstico do ambiente e do projeto. | `packages/cli/src/index.ts:12-13` |
| `startDev`, `DevOptions`, `DevController`, `DevWatcher` | função e tipos | Modo de desenvolvimento com observação de arquivos. | `packages/cli/src/index.ts:14-15` |
| `startTunnel`, `TunnelOptions`, `TunnelController`, `TunnelLike` | função e tipos | Túnel para expor o agente localmente. | `packages/cli/src/index.ts:16-17` |
| `listSessions`, `findSession`, `findLatestSession`, `renameSession`, `forkSession`, `resolveSession`, `writeSessionMeta`, `derivePreview`, `generateSessionId`, `sessionFilePath`, e tipos de sessão | funções e tipos | Gerenciamento de sessões de conversa. | `packages/cli/src/index.ts:18-35` |
| `loadPlugins`, `mergePluginsIntoBundle`, e tipos de plugin | funções e tipos | Carregamento de plugins. | `packages/cli/src/index.ts:36`, `:66-78` |
| `McpClient`, `bridgeMcpServers`, `disposeMcpClients`, `McpTool`, `McpBridgeResult` | classe, funções e tipos | Cliente MCP e ponte para servidores MCP. | `packages/cli/src/index.ts:37-38` |
| `computeCost`, `getPricing`, `registerPricing`, `ModelPricing`, `ComputedCost`, `TokenUsageLike` | funções e tipos | Telemetria de custo por modelo. | `packages/cli/src/index.ts:39-40` |
| `createOpenAiEmbedder`, `buildRagFromConfig`, `indexSources`, e tipos de RAG | funções e tipos | Embedder OpenAI e montagem de RAG a partir da configuração. | `packages/cli/src/index.ts:41-51` |
| `HookDispatcher`, `configHooksToHandlers`, e tipos de hook | classe, função e tipos | Hooks de ciclo de vida definidos na configuração. | `packages/cli/src/index.ts:52-53` |
| `defaultPolicy`, `evaluatePolicy`, `applyPolicyToTool`, `applyPolicyToTools`, e tipos de permissão | funções e tipos | Políticas de permissão de ferramentas. | `packages/cli/src/index.ts:54-65` |

Exemplo real de import, no fixture do README:

```ts
import '@agentskit/cli'
```

Fonte: `packages/cli/tests/fixtures/readme-quickstart.ts:1`. Para o uso como programa, a entrada é `createCli` (`packages/cli/src/index.ts:1`).

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-adapters]] (`packages/cli/package.json:52`), [[agentskit-core]] (`:53`), [[agentskit-cross-platform]] (`:54`), [[agentskit-ink]] (`:55`), [[agentskit-integrations]] (`:56`), [[agentskit-memory]] (`:57`), [[agentskit-net]] (`:58`), [[agentskit-rag]] (`:59`), [[agentskit-runtime]] (`:60`), [[agentskit-skills]] (`:61`), [[agentskit-tools]] (`:62`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/cli`. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/cli.mdx` (`.doc-bridge/index.json`, `handoffs.cli`) |

Não há dependência de `@agentskit/templates` no manifesto (`packages/cli/package.json:52-62`).

## Dados e efeitos

- Chaves de provedor: a CLI lê as variáveis indicadas pela tabela de provedores (`packages/cli/src/providers.ts:164`), pelo ambiente de diagnóstico (`packages/cli/src/doctor.ts:140-174`) e pelo helper de comandos (`packages/cli/src/commands/shared.ts:12`). Os nomes exatos dependem do provedor escolhido.
- Chaves de RAG: `OPENAI_API_KEY` e `OPENROUTER_API_KEY`, quando o embedder não recebe a chave por opção (`packages/cli/src/extensibility/rag/runner.ts:58`).
- Integrações: credenciais de integração são lidas do ambiente por `integrationToolsFromEnv` (`packages/cli/src/resolve.ts:77`).
- Processos filhos: o cliente MCP inicia servidores com o ambiente do processo mais o `env` da especificação (`packages/cli/src/extensibility/mcp/client.ts:52`); o modo `dev` inicia subprocesso com `FORCE_COLOR=1` (`packages/cli/src/dev.ts:120`).
- Rede: chamadas aos provedores de modelo e às integrações; `startTunnel` expõe o agente por túnel.
- Arquivos: escreve o projeto inicial (`writeStarterProject`) e as sessões em disco (`sessionFilePath`).
- Código gerado: o gerador de projeto escreve `import.meta.env.VITE_<CHAVE>` em código de exemplo (`packages/cli/src/init.ts:75`). Isso é texto gerado, não leitura do pacote.

## Como mexer (para agentes)

- **Comece por:** `packages/cli/CONVENTIONS.md`, `packages/cli/src/index.ts` e `packages/cli/src/commands` (registro de comandos).
- **Raiz de edição do handoff:** `packages/cli` (`.doc-bridge/index.json`, `handoffs.cli`).
- **Invariantes:**
  - Sair do processo com `process.exit(code)` apenas no nível superior; nunca dentro de função de biblioteca (`packages/cli/CONVENTIONS.md:18`).
  - Cores via `chalk` ou Ink, sem códigos ANSI fixos (`packages/cli/CONVENTIONS.md:23`).
  - Toda flag curta (`-p`) tem a forma longa correspondente (`--provider`) (`packages/cli/CONVENTIONS.md:29`).
- **Testes:** `packages/cli/tests/commands*.test.ts` (comandos), `tests/chat-app.test.tsx` e `tests/runtime-hooks.test.tsx` (interface e hooks), `tests/providers.test.ts` e `tests/provider-matrix.test.ts` (provedores), `tests/init*.test.ts` (projeto inicial), `tests/doctor*.test.ts`, `tests/dev*.test.ts`, `tests/tunnel.test.ts`, `tests/sessions*.test.ts`, `tests/mcp*.test.ts`, `tests/rag*.test.ts`, `tests/permissions.test.ts` e `tests/components-*.test.ts` (componentes).
- **Validação:** `pnpm --filter @agentskit/cli test` (executa `vitest run`, `packages/cli/package.json:46`) e `pnpm --filter @agentskit/cli lint` (`tsc --noEmit`, `packages/cli/package.json:48`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilha:** a CLI depende de onze pacotes; uma mudança em qualquer um deles pode quebrar comandos. Rode os testes do pacote afetado antes de alterar a CLI.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados pelos documentos citados na fonte: [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0009 - Regras de composição e dependência]]. Histórico recente (`git log --oneline -8 -- packages/cli`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `3eabaf7f feat(cross-platform): add shared testing helpers (#1777)`
- `d6da728f fix(cli): bound network response bodies (#1758)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`

> [!info]- Detalhe técnico
> - `packages/cli/package.json:1` — manifesto, dependências (`:52-62`) e scripts (`:46`, `:48`).
> - `packages/cli/src/index.ts:1` — entrada pública.
> - `packages/cli/src/providers.ts:164` — leitura de chaves de provedor.
> - `packages/cli/src/resolve.ts:77` — credenciais de integração do ambiente.
> - `packages/cli/src/extensibility/rag/runner.ts:58` — chaves de RAG.
> - `packages/cli/tests/fixtures/readme-quickstart.ts:1` — import de exemplo.
