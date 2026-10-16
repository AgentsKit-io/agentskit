---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/net"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/net/package.json", "packages/net/src/index.ts", "apps/docs-next/content/docs/for-agents/net.mdx", "AGENTS.md", "packages/net/CONVENTIONS.md", "packages/net/tests/address.test.ts", "packages/net/tests/body.test.ts", "packages/net/tests/fetch.test.ts", "packages/net/tests/package-manifest.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0007-docs-platform-fumadocs.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-net

> [!tldr] Em linguagem comum
> Pacote net do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/net` publica a superfície definida em `packages/net/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/net.mdx` e limita edições a `packages/net`. Fonte: `packages/net/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.net`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `NetError` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:1` |
| `NetErrorCodes` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:1` |
| `isAbortError` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:1` |
| `NetErrorCode` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:2` |
| `RETRYABLE_STATUSES` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:3` |
| `computeBackoff` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:3` |
| `isRetryableStatus` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:3` |
| `parseRetryAfter` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:3` |
| `retry` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:3` |
| `sleep` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:3` |
| `BackoffOptions` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:4` |
| `RetryContext` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:4` |
| `RetryOptions` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:4` |
| `anySignal` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:5` |
| `timeoutSignal` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:5` |
| `withTimeout` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:5` |
| `fetchWithRetry` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:6` |
| `FetchWithRetryOptions` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:7` |
| `readBody` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:8` |
| `readJson` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:8` |
| `readText` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:8` |
| `ReadBodyOptions` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:9` |
| `parseSSE` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:10` |
| `parseSSEResponse` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:10` |
| `ParseSSEOptions` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:11` |
| `SSEEvent` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:11` |
| `assertPublicUrl` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:12` |
| `classifyAddress` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:12` |
| `isPublicAddress` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:12` |
| `AddressRange` | export nomeado | API pública do pacote. | `packages/net/src/index.ts:13` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `Adapters, tools and the other AgentsKit repositories each carried their own retry loop, `Retry-After` parsing, SSE line splitter and private-IP check, with different bugs in each. `@agentskit/net` owns them, built on `eventsource-parser` and `ipaddr.js`, so callers import one tested implementation.` — `packages/net/README.md:26`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/net/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/net.mdx` (`.doc-bridge/index.json`, `handoffs.net`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/net.mdx`, `packages/net/CONVENTIONS.md` e `packages/net/src/index.ts`.
- **Raiz de edição do handoff:** `packages/net` (`.doc-bridge/index.json`, `handoffs.net`).
- **Invariantes:** Unit tests (vitest) inject `fetch`, `random` and `lookup`; no network. (`packages/net/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/net/tests/address.test.ts`, `packages/net/tests/body.test.ts`, `packages/net/tests/fetch.test.ts`, `packages/net/tests/package-manifest.test.ts`, `packages/net/tests/retry.test.ts`, `packages/net/tests/rules.test.ts`, `packages/net/tests/sse.test.ts`, `packages/net/tests/timeout.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/net test` e `pnpm --filter @agentskit/net lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Adapter Contract]], [[agentskit ADR-0006 - Runtime Contract]], [[agentskit ADR-0007 - Documentation platform: Fumadocs]], [[agentskit ADR-0008 - Runtime argument validation]], [[agentskit ADR-0010 - Network egress policy (safeFetch)]], [[agentskit ADR-0013 - Runtime validation for serialized message records]], [[agentskit ADR-0021 - Versioned ecosystem manifest and evidence-backed claims]], [[agentskit ADR-0024 - Evidence-backed package graduation]], [[agentskit ADR-0026 - Integration execution safety boundaries]], [[agentskit ADR-0028 - MCP bridge beta boundaries]], [[agentskit ADR-0029 - Shared ecosystem web shell]], [[agentskit ADR-0031 - Shared CLI adapter execution boundary]], [[agentskit ADR-0037 - One package owns HTTP plumbing]]. Histórico recente (`git log --oneline -15 -- packages/net`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `80b873d9 chore(net): prepare 0.2.0 release (#1744)`
- `991d26a2 Merge branch 'main' of github.com:AgentsKit-io/agentskit into codex/net00-parity`
- `dc037805 fix(docs): include net purpose in generated answers`

> [!info]- Detalhe técnico
> - `packages/net/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/net/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/net.mdx:1` — handoff documental de agentes.
> - `packages/net/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
