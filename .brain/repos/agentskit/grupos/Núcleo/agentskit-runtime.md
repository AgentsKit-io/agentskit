---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/runtime"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/runtime/package.json", "packages/runtime/src/index.ts", "apps/docs-next/content/docs/for-agents/runtime.mdx", "AGENTS.md", "packages/runtime/CONVENTIONS.md", "packages/runtime/tests/agent-substrate.test.ts", "packages/runtime/tests/background.test.ts", "packages/runtime/tests/chat-trigger.test.ts", "packages/runtime/tests/delegates.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0004-retriever-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-runtime

> [!tldr] Em linguagem comum
> Pacote runtime do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/runtime` publica a superfície definida em `packages/runtime/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/runtime.mdx` e limita edições a `packages/runtime`. Fonte: `packages/runtime/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.runtime`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createRuntime` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:1` |
| `invokeStructured` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:2` |
| `piiDenyValidator` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:3` |
| `createSharedContext` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:4` |
| `SharedContext` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:5` |
| `ReadonlySharedContext` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:5` |
| `RuntimeConfig` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:6` |
| `RunOptions` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:6` |
| `RunResult` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:6` |
| `DelegateConfig` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:6` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:12` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:25` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:44` |
| `createCompareHandler` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:56` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:57` |
| `createVoteHandler` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:62` |
| `VoteHandlerOptions` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:63` |
| `VoteJudgeFn` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:63` |
| `createDebateHandler` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:64` |
| `DebateHandlerOptions` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:65` |
| `createAuctionHandler` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:66` |
| `AuctionHandlerOptions` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:67` |
| `AuctionScorerFn` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:67` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:74` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:88` |
| `speculate` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:101` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:102` |
| `createChatTrigger` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:109` |
| `{` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:110` |
| `createQuotaTracker` | export nomeado | API pública do pacote. | `packages/runtime/src/index.ts:129` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { createRuntime } from '@agentskit/runtime'` — `packages/runtime/README.md:52`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-net]] (`packages/runtime/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/runtime.mdx` (`.doc-bridge/index.json`, `handoffs.runtime`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: OPENAI_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/runtime.mdx`, `packages/runtime/CONVENTIONS.md` e `packages/runtime/src/index.ts`.
- **Raiz de edição do handoff:** `packages/runtime` (`.doc-bridge/index.json`, `handoffs.runtime`).
- **Invariantes:** The conductor. Implements the Runtime contract ([ADR 0006](../../docs/architecture/adrs/0006-runtime-contract.md)) with all fourteen invariants. (`packages/runtime/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/runtime/tests/agent-substrate.test.ts`, `packages/runtime/tests/background.test.ts`, `packages/runtime/tests/chat-trigger.test.ts`, `packages/runtime/tests/delegates.test.ts`, `packages/runtime/tests/delegation.test.ts`, `packages/runtime/tests/durable.test.ts`, `packages/runtime/tests/flow.test.ts`, `packages/runtime/tests/helpers.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/runtime test` e `pnpm --filter @agentskit/runtime lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0008 - Validação de argumentos em runtime]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]], [[agentskit ADR-0011 - Validação de requisições de entrada (gatilhos de chat)]], [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]], [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]], [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]], [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]], [[agentskit ADR-0027 - Limites de segurança do statechart beta]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]], [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]], [[agentskit ADR-0039 - IDs criptográficos para identificadores gerados]], [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]], [[agentskit ADR-0044 - Armazenamento durável de custo por tenant]]. Histórico recente (`git log --oneline -15 -- packages/runtime`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `4616f921 fix(runtime): use abortable durable retry sleep (#1762)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `53c3b7a7 fix(runtime): use UUID flow run IDs (#1748)`

## No law-os

É dependência declarada no backend. Não há nó multiagente no grafo desta revisão; não confundir quatro agentes em passos distintos com compare/vote/debate/auction, nem deduzir ausência global de uso da biblioteca.

| Momento | Uso no produto |
|---|---|
| Antes / fora da execução | Papel descrito acima; composição não implica chamada em cada run. |
| [[Revisão de contratos - law-os]] | Não há etapa dedicada demonstrada para este pacote; veja a composição e os limites acima. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.

> [!info]- Detalhe técnico
> - `packages/runtime/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/runtime/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/runtime.mdx:1` — handoff documental de agentes.
> - `packages/runtime/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
