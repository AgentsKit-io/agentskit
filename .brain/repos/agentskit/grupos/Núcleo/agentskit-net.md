---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/net"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores em manifests; auditado em 2026-10-16"
fontes: ["packages/net/package.json", "packages/net/src/index.ts", "packages/net/src/fetch.ts", "packages/net/src/address.ts", "packages/net/README.md", "packages/net/fixtures/readme-quickstart.ts", "apps/docs-next/content/docs/for-agents/net.mdx", "AGENTS.md", "packages/net/CONVENTIONS.md", "packages/net/tests/address.test.ts", "packages/net/tests/body.test.ts", "packages/net/tests/fetch.test.ts", "packages/net/tests/package-manifest.test.ts", "docs/architecture/adrs/0037-net-package.md", "docs/architecture/adrs/0010-egress-policy.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-net

> [!tldr] Em linguagem comum
> Faz as chamadas HTTP do ecossistema com segurança: tenta de novo com espera crescente quando a falha é passageira, põe limite de tempo e de tamanho, lê respostas em streaming (SSE) e recusa endereços privados. Adaptadores e ferramentas usam este pacote em vez de escrever o próprio código de rede.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/net` é o único responsável por HTTP do ecossistema (ADR 0037): retentativas com `Retry-After`, tempo limite por tentativa, leitura de corpo com limite de bytes, parsing de SSE e checagem de endereços para evitar SSRF (`packages/net/CONVENTIONS.md:3-7`). Antes dele, cada repositório tinha o próprio laço de retentativa e o próprio separador de SSE, com erros diferentes (`packages/net/README.md:26`). O pacote está em beta (`packages/net/package.json:63-64`, ADR 0037).

## API e contratos

Exports de `packages/net/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `NetError`, `NetErrorCodes`, `isAbortError` | classe, catálogo e função | Erros tipados `AK_NET_*` | `src/index.ts:1` |
| `NetErrorCode` | tipo | Códigos de erro | `src/index.ts:2` |
| `RETRYABLE_STATUSES`, `computeBackoff`, `isRetryableStatus`, `parseRetryAfter`, `retry`, `sleep` | constante e funções | Laço de retentativa com backoff e `Retry-After` | `src/index.ts:3` (`src/retry.ts`) |
| `BackoffOptions`, `RetryContext`, `RetryOptions` | tipos | Opções do laço de retentativa | `src/index.ts:4` |
| `anySignal`, `timeoutSignal`, `withTimeout` | funções | Sinais de cancelamento e tempo limite | `src/index.ts:5` (`src/timeout.ts`) |
| `fetchWithRetry` | função | `fetch` com retentativa e tempo limite por tentativa | `src/index.ts:6` (`src/fetch.ts`) |
| `FetchWithRetryOptions` | tipo | Opções de `fetchWithRetry` | `src/index.ts:7` |
| `readBody`, `readJson`, `readText` | funções | Leitura de corpo com limite de bytes | `src/index.ts:8` (`src/body.ts`) |
| `ReadBodyOptions` | tipo | Opções de leitura de corpo | `src/index.ts:9` |
| `parseSSE`, `parseSSEResponse` | funções | Parsing de Server-Sent Events | `src/index.ts:10` (`src/sse.ts`) |
| `ParseSSEOptions`, `SSEEvent` | tipos | Opções e evento SSE | `src/index.ts:11` |
| `assertPublicUrl`, `classifyAddress`, `isPublicAddress` | funções | Checagem de endereço público (anti-SSRF) | `src/index.ts:12` (`src/address.ts`) |
| `AddressRange`, `AssertPublicUrlOptions`, `LookupFn` | tipos | Faixas de endereço e opções da checagem; `LookupFn` é a resolução de DNS injetada | `src/index.ts:13` |

Exemplo real (README do pacote, `packages/net/README.md:45-51`; mesmo código em `packages/net/fixtures/readme-quickstart.ts:1-7`):

```ts
import { assertPublicUrl, fetchWithRetry, parseSSEResponse, readJson } from '@agentskit/net'
```

Subpath: `@agentskit/net/rules` (`packages/net/package.json:28-32`), com `NET_RULES` para verificação de guarda-corpo (`CONVENTIONS.md:17`).

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/net/package.json:52`) |
| Dependências externas | `eventsource-parser` ^4.1.1 e `ipaddr.js` ^2.5.0 (`packages/net/package.json:53-54`); `eventsource-parser` é empacotado porque distribui só ESM (`CONVENTIONS.md:31-32`). |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/net.mdx` (`.doc-bridge/index.json`, `handoffs.net`) |
| Consumidores dentro do repo | 10 manifestos declaram `@agentskit/net` (busca em `packages` e `apps`, commit `9f8d8551`): `packages/adapters`, `cli`, `integrations`, `mcp`, `memory`, `observability`, `rag`, `runtime`, `tools`, e `apps/docs-next`. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Rede: é o pacote que faz as chamadas HTTP; o destino vem do chamador. `assertPublicUrl` recusa endereços não públicos (`packages/net/src/address.ts`).
- DNS: a resolução é injetada pelo chamador (`lookup`, `CONVENTIONS.md:29`); o pacote não resolve nomes sozinho.
- Sem `node:` imports: roda em Node, Bun, Deno, navegador e edge (`CONVENTIONS.md:27-29`).
- Variáveis de ambiente: nenhuma verificada no código.

## Como mexer (para agentes)

- **Comece por:** `packages/net/src/fetch.ts` (retentativa e tempo limite), `packages/net/src/address.ts` (anti-SSRF) e `packages/net/CONVENTIONS.md` (regras).
- **Raiz de edição do handoff:** `packages/net` (`.doc-bridge/index.json`, `handoffs.net`).
- **Invariantes** (`packages/net/CONVENTIONS.md:25-34`):
  - Só APIs de plataforma web (`fetch`, `Response`, `ReadableStream`, `AbortSignal`); sem imports `node:`.
  - Nunca retentar requisição com corpo em stream.
  - Não retentar método não idempotente sem opt-in (`retryMethods: 'all'`, `README.md:75`; teste em `tests/fetch.test.ts:62-64`).
  - Erros tipados `NetError` com códigos `AK_NET_*`.
- **Testes:** `packages/net/tests/` (`address.test.ts`, `body.test.ts`, `fetch.test.ts`, `retry.test.ts`, `rules.test.ts`, `sse.test.ts`, `timeout.test.ts`, `package-manifest.test.ts`). Os testes injetam `fetch`, `random` e `lookup`; não usam rede (`CONVENTIONS.md:38`).
- **Validação do pacote:** `pnpm --filter @agentskit/net test` (`packages/net/package.json:46`) e `pnpm --filter @agentskit/net lint` (`:48`, `tsc --noEmit`). Cobertura de linhas: piso de 90%, com `src/fetch.ts` e `src/address.ts` como críticos (`CONVENTIONS.md:39`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas:** trazer lógica de provedor (formato de requisição de modelo) para o pacote (`CONVENTIONS.md:21`); criar um laço de retentativa próprio em outro pacote; retentar POST por padrão.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]] (criação do pacote) e [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]] (política de saída que `assertPublicUrl` implementa).

Histórico recente (`git log --oneline -15 -- packages/net`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `80b873d9 chore(net): prepare 0.2.0 release (#1744)`

> [!info]- Detalhe técnico
> - `packages/net/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/net/src/index.ts:1` — entrada pública.
> - `packages/net/src/fetch.ts:1` — `fetchWithRetry`.
> - `apps/docs-next/content/docs/for-agents/net.mdx:1` — handoff documental de agentes.
> - `packages/net/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
