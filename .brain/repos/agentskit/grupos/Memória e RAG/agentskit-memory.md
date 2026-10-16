---
tipo: pacote
repo: agentskit
grupo: Memória e RAG
npm: "@agentskit/memory"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores por git grep; auditado em 2026-10-16"
fontes: ["packages/memory/package.json", "packages/memory/src/index.ts", "packages/memory/src/postgres.ts", "packages/memory/CONVENTIONS.md", "apps/docs-next/content/docs/for-agents/memory.mdx", "AGENTS.md", "packages/memory/tests/cancellation.test.ts", "packages/memory/tests/encrypted.test.ts", "packages/memory/tests/file-chat.test.ts", "packages/memory/tests/postgres-contract.ts", "packages/memory/tests/postgres.integration.test.ts", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0013-memory-record-runtime-validation.md", "docs/architecture/adrs/0019-cancellable-chat-memory-operations.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/memoria-e-rag]
---

# agentskit-memory

> [!tldr] Em linguagem comum
> Guarda o histórico de conversa e a busca vetorial do agente em um lugar durável: arquivo, SQLite, Turso, Redis, Postgres, navegador ou um banco vetorial remoto. Inclui também memória de chave e valor, grafo, perfil de personalização, criptografia, redação de dados sensíveis e "esquecer" um assunto.

← [[00 Grupo - agentskit - Memória e RAG]]

## O que faz e por que existe

O pacote `@agentskit/memory` implementa os contratos de memória (ADR 0003): `ChatMemory` para histórico de conversa e `VectorMemory` para busca por similaridade (`packages/memory/CONVENTIONS.md:3`). Cada backend é uma fábrica que devolve um desses contratos. O pacote não gera embeddings (eles vêm de `@agentskit/adapters`) e não faz chunking nem recuperação de documentos (isso é `@agentskit/rag`).

## API e contratos

Exports de `packages/memory/src/index.ts` (linhas verificadas no commit `9f8d8551`). Tipos entre parênteses.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `fileChatMemory` | função | `ChatMemory` em arquivo | `src/index.ts:1` |
| `createWebStorageMemory` (`WebStorageLike`, `WebStorageMemoryMigration`, `WebStorageMemoryOptions`) | função e tipos | `ChatMemory` em armazenamento web (localStorage ou similar) | `src/index.ts:2-3` |
| `sqliteChatMemory` (`SqliteChatMemoryConfig`) | função e tipo | `ChatMemory` em SQLite | `src/index.ts:5-6` |
| `tursoChatMemory` (`TursoChatMemoryConfig`) | função e tipo | `ChatMemory` em Turso | `src/index.ts:8-9` |
| `redisChatMemory` (`RedisChatMemoryConfig`) | função e tipo | `ChatMemory` em Redis | `src/index.ts:11-12` |
| `redisVectorMemory` (`RedisVectorMemoryConfig`) | função e tipo | `VectorMemory` em Redis | `src/index.ts:14-15` |
| `fileVectorMemory` (`FileVectorMemoryConfig`) | função e tipo | `VectorMemory` em arquivo | `src/index.ts:17-18` |
| `VectorStore`, `VectorStoreDocument`, `VectorStoreResult`, `RedisClientAdapter`, `RedisConnectionConfig` | tipos | Contratos internos dos backends | `src/index.ts:20-21` |
| `createInMemoryPersonalization`, `renderProfileContext` (`PersonalizationProfile`, `PersonalizationStore`) | funções e tipos | Perfil de personalização | `src/index.ts:23-30` |
| `createInMemoryGraph` (`GraphMemory`, `GraphNode`, `GraphEdge`, `GraphQuery`) | função e tipos | Memória em grafo | `src/index.ts:32-33` |
| `pgvector`, `pinecone`, `qdrant`, `chroma`, `upstashVector`, `supabaseVectorStore`, `weaviateVectorStore`, `milvusVectorStore`, `mongoAtlasVectorStore`, `matchesFilter` (+ configs, `RemoteHttpConfig`) | funções e tipos | `VectorMemory` sobre bancos vetoriais | `src/index.ts:34-59` (`src/vector.ts`) |
| `createEncryptedMemory` (`EncryptedMemoryOptions`, `EncryptedEnvelope`) | função e tipos | Envelope criptografado sobre outra memória | `src/index.ts:61-62` (`src/encrypted.ts`) |
| `createHierarchicalMemory` (+ tipos) | função e tipos | Memória em camadas | `src/index.ts:64-69` |
| `forgetSubject`, `makeForgettable` (+ tipos) | funções e tipos | Apagar os dados de um assunto | `src/index.ts:71-76` (`src/forget.ts`) |
| `wrapChatMemoryWithRedaction`, `wrapVectorMemoryWithRedaction` (+ tipos) | funções e tipos | Redação de dados antes de gravar | `src/index.ts:78-86` |
| `AgentskitMemoryStore` (+ configs e tipos de cliente) | tipos | Armazenamento de chave e valor com TTL e despejo | `src/index.ts:88-108` (`src/kv-store-types.ts`) |
| `createInMemoryStore`, `createFileStore`, `createLocalStorageStore` | funções | Armazenamento de chave e valor: memória, arquivo, localStorage | `src/index.ts:109-110` |
| `createSqliteStore`, `tryDefaultSqliteOpener` | funções | Chave e valor em SQLite | `src/index.ts:111-112` |
| `createRedisStore`, `adaptIoredis`, `tryDefaultRedisClient` | funções | Chave e valor em Redis | `src/index.ts:113-114` |
| `createVectorStore` | função | Chave e valor sobre vetor | `src/index.ts:115-116` |
| `createKvMemoryFromConfig`, `createKvMemoryFromConfigAuto`, `MemoryBackendNotImplementedError`, `MEMORY_BACKEND_SUPPORT`, `isMemoryBackendSupported` | funções, classe e constante | Escolha de backend por configuração | `src/index.ts:117-124` (`src/kv-store-factory.ts`) |

Subcaminhos publicados (`packages/memory/package.json:36-50`): `./personalization`, `./web-storage` e `./postgres`. O subcaminho `./postgres` não passa pela entrada principal. Ele exporta `postgresChatTable` (`src/postgres.ts:10`), `postgresChatMigrationSql` (`:17`) e `postgresChatMemory({ db, tenantId, sessionId, maxMessages })` (`:52`), que usa Drizzle.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] e [[agentskit-net]] (`packages/memory/package.json:68-71`) |
| Peers opcionais | `vectra`, `drizzle-orm` e `pg` (`packages/memory/package.json:72-87`) |
| Consumidores dentro do repo | 3 manifestos declaram `@agentskit/memory` (busca em `packages` e `apps`, commit `9f8d8551`): `apps/docs-next`, `apps/example-ink` e `packages/cli`. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/memory.mdx` (`.doc-bridge/index.json`, `handoffs.memory`) |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Armazenamento: arquivo (`fileChatMemory`, `fileVectorMemory`, `createFileStore`), SQLite (`sqliteChatMemory`, `createSqliteStore`), Turso, Redis (`redisChatMemory`, `redisVectorMemory`, `createRedisStore`), armazenamento web (`createWebStorageMemory`, `createLocalStorageStore`) e Postgres (`./postgres`).
- Bancos vetoriais remotos: `pgvector`, `pinecone`, `qdrant`, `chroma` e os demais são configurados com `RemoteHttpConfig` (`src/index.ts:34-59`). A forma exata da chamada de rede está nos módulos `src/vector.ts`, não verificada nesta auditoria.
- Criptografia: `createEncryptedMemory` grava um envelope (`EncryptedEnvelope`) sobre outra memória (`src/index.ts:61-62`). Algoritmo e gestão de chave não verificados nesta auditoria.
- Variáveis de ambiente: nenhuma lida em `packages/memory/src` (busca por `process.env` e `_API_KEY` sem resultado). A configuração chega pelo construtor (`CONVENTIONS.md:62`).

## Como mexer (para agentes)

- **Comece por:** `packages/memory/src/index.ts` (superfície), `packages/memory/src/kv-store-factory.ts` (escolha de backend) e `packages/memory/CONVENTIONS.md` (contratos CM e VM).
- **Raiz de edição do handoff:** `packages/memory` (`.doc-bridge/index.json`, `handoffs.memory`).
- **Invariantes** (`packages/memory/CONVENTIONS.md:11-33`):
  - `ChatMemory` (CM1–CM6): `load()` devolve um snapshot; `save()` substitui tudo, não acrescenta (CM2); a ordem é preservada; estado vazio devolve `[]`, nunca `null`.
  - `VectorMemory` (VM1–VM8): `store` é upsert por `id`; a dimensão é checada na construção e divergências são recusadas; `search` ordena por score decrescente; `threshold` é exclusivo pela parte de baixo; `topK` é teto, não piso.
  - Conexões só são abertas na primeira chamada, nunca no import (`CONVENTIONS.md:37-38`, `:55`).
  - Sem leitura de ambiente na fábrica (`CONVENTIONS.md:62`).
  - Bundle abaixo de 16 KB gzip (`CONVENTIONS.md:59`).
- **Testes:** `packages/memory/tests/` (37 arquivos, entre eles `cancellation`, `encrypted`, `file-chat`, `file-vector`, `forget`, `graph`, `hierarchical`, `kv-store-*`, `personalization`, `redaction`, `sqlite`, `turso`, `redis`, `vector`, `vector-http.integration` e `postgres.integration`).
- **Validação do pacote:** `pnpm --filter @agentskit/memory test` (`packages/memory/package.json:61`, roda o build do turbo e `vitest run`) e `pnpm --filter @agentskit/memory lint` (`:63`, `tsc --noEmit`). Os testes de Postgres exigem banco e têm script próprio (`test:postgres`, `:65`). Cobertura de linhas: 90% (`CONVENTIONS.md:60`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:49-55`): implementar `save` como append; devolver `null` de `load` vazio; misturar dimensões de embedding no mesmo store; completar `search` até `topK`; abrir conexão no import.

> [!question] Dúvida: escopo e número de invariantes
> `CONVENTIONS.md:7-8` lista só `fileChatMemory`, `sqliteChatMemory`, `redisChatMemory`, `fileVectorMemory` e `redisVectorMemory` como escopo, mas o `index.ts` exporta também Turso, Postgres, Pinecone, Qdrant e outros. `CONVENTIONS.md:27` diz "oito invariantes VM1–VM8", mas só cinco estão escritos (`:28-32`). Confirmar a lista correta com o time.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]] (registros de memória), [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]] (`tests/cancellation.test.ts`) e [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]].

Histórico recente (`git log --oneline -15 -- packages/memory`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `2545678e feat(memory): Drizzle/Postgres ChatMemory subpath (#1827)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`

> [!info]- Detalhe técnico
> - `packages/memory/package.json:1` — manifesto, subcaminhos, peers opcionais e scripts.
> - `packages/memory/src/index.ts:1` — entrada pública.
> - `packages/memory/src/postgres.ts:52` — `postgresChatMemory`.
> - `apps/docs-next/content/docs/for-agents/memory.mdx:1` — handoff documental de agentes.
> - `packages/memory/CONVENTIONS.md:1` — contratos CM e VM e orientação de contribuição.

> [!info]- Evidência de uso no law-os (não verificada)
> A versão anterior desta nota dizia que o law-os declara a memória e que a revisão não mostra uso de memória de agente. Essa afirmação depende de notas `law-os - ...` e de um repositório que não está neste vault nem neste worktree. Foi retirada desta versão até confirmação.
