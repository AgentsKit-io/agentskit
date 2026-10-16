---
tipo: pacote
repo: agentskit
grupo: Memória e RAG
npm: "@agentskit/memory"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/memory/package.json", "packages/memory/src/index.ts", "apps/docs-next/content/docs/for-agents/memory.mdx", "AGENTS.md", "packages/memory/CONVENTIONS.md", "packages/memory/tests/cancellation.test.ts", "packages/memory/tests/chroma-v2.test.ts", "packages/memory/tests/encrypted-extra.test.ts", "packages/memory/tests/encrypted.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0003-memory-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/memoria-e-rag]
---

# agentskit-memory

> [!tldr] Em linguagem comum
> Pacote memory do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Memória e RAG]]

## O que faz e por que existe

O pacote `@agentskit/memory` publica a superfície definida em `packages/memory/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/memory.mdx` e limita edições a `packages/memory`. Fonte: `packages/memory/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.memory`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `fileChatMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:1` |
| `createWebStorageMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:2` |
| `WebStorageLike` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:3` |
| `WebStorageMemoryMigration` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:3` |
| `WebStorageMemoryOptions` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:3` |
| `sqliteChatMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:5` |
| `SqliteChatMemoryConfig` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:6` |
| `tursoChatMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:8` |
| `TursoChatMemoryConfig` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:9` |
| `redisChatMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:11` |
| `RedisChatMemoryConfig` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:12` |
| `redisVectorMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:14` |
| `RedisVectorMemoryConfig` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:15` |
| `fileVectorMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:17` |
| `FileVectorMemoryConfig` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:18` |
| `VectorStore` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:20` |
| `VectorStoreDocument` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:20` |
| `VectorStoreResult` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:20` |
| `RedisClientAdapter` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:21` |
| `RedisConnectionConfig` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:21` |
| `{` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:27` |
| `createInMemoryGraph` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:32` |
| `GraphMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:33` |
| `GraphNode` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:33` |
| `GraphEdge` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:33` |
| `GraphQuery` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:33` |
| `{` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:46` |
| `createEncryptedMemory` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:61` |
| `EncryptedMemoryOptions` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:62` |
| `EncryptedEnvelope` | export nomeado | API pública do pacote. | `packages/memory/src/index.ts:62` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { postgresChatMemory, postgresChatMigrationSql, postgresChatTable } from '@agentskit/memory/postgres'` — `packages/memory/tests/postgres-contract.ts:5`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-net]] (`packages/memory/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/memory.mdx` (`.doc-bridge/index.json`, `handoffs.memory`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: AK_POSTGRES_TEST_PORT, ANTHROPIC_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/memory.mdx`, `packages/memory/CONVENTIONS.md` e `packages/memory/src/index.ts`.
- **Raiz de edição do handoff:** `packages/memory` (`.doc-bridge/index.json`, `handoffs.memory`).
- **Invariantes:** 3. Implement the six invariants CM1–CM6: (`packages/memory/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/memory/tests/cancellation.test.ts`, `packages/memory/tests/chroma-v2.test.ts`, `packages/memory/tests/encrypted-extra.test.ts`, `packages/memory/tests/encrypted.test.ts`, `packages/memory/tests/file-chat.test.ts`, `packages/memory/tests/file-vector.test.ts`, `packages/memory/tests/filter.test.ts`, `packages/memory/tests/forget.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/memory test` e `pnpm --filter @agentskit/memory lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]], [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]], [[agentskit ADR-0043 - Composição de RAG vinculada a partição]], [[agentskit ADR-0044 - Armazenamento durável de custo por tenant]]. Histórico recente (`git log --oneline -15 -- packages/memory`):

- `e8d42064 chore: version packages (#1757)`
- `2545678e feat(memory): Drizzle/Postgres ChatMemory subpath (#1827)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `74961521 docs(memory): correct package validation budgets`

## No law-os

É dependência declarada no backend. A revisão documentada não demonstra ativação de memória de agente; os stores de runs/documentos pertencem à plataforma e são outro tipo de persistência.

| Momento | Uso no produto |
|---|---|
| Antes / fora da execução | Papel descrito acima; composição não implica chamada em cada run. |
| [[Revisão de contratos - law-os]] | Não há etapa dedicada demonstrada para este pacote; veja a composição e os limites acima. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.

> [!info]- Detalhe técnico
> - `packages/memory/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/memory/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/memory.mdx:1` — handoff documental de agentes.
> - `packages/memory/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
