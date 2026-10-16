---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/statechart"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores em manifests; auditado em 2026-10-16"
fontes: ["packages/statechart/package.json", "packages/statechart/src/index.ts", "packages/statechart/src/statechart.ts", "packages/statechart/README.md", "apps/docs-next/content/docs/for-agents/statechart.mdx", "AGENTS.md", "packages/statechart/CONVENTIONS.md", "packages/statechart/tests/json.test.ts", "packages/statechart/tests/package-manifest.test.ts", "packages/statechart/tests/snapshot.test.ts", "packages/statechart/tests/statechart.test.ts", "docs/architecture/adrs/0020-serializable-interaction-state.md", "docs/architecture/adrs/0027-statechart-beta-boundaries.md", "docs/architecture/adrs/README.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-statechart

> [!tldr] Em linguagem comum
> Estado de interação previsível: define estados e transições de uma tela ou fluxo de agente, e salva e restaura esse estado como JSON. Não executa agentes nem ferramentas; só decide para qual estado a interação vai.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/statechart` oferece máquinas de estado determinísticas e serializáveis para interfaces de agente, independentes de UI e de execução (`packages/statechart/CONVENTIONS.md:5-8`). Ele não tem efeitos, retentativas, persistência nem entrega de eventos: isso é de outros pacotes (`CONVENTIONS.md:10-16`). Está em beta (`packages/statechart/package.json:51-52`, ADR 0020 e 0027).

## API e contratos

Exports de `packages/statechart/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createStatechartInstance` | função | Cria uma instância a partir de uma definição, contexto inicial e opções (`instanceId`, `now`) | `src/index.ts:2` (`src/statechart.ts:63`) |
| `transitionStatechart` | função | Aplica um evento e devolve transição aceita ou rejeitada | `src/index.ts:4` |
| `notifyStatechartObserver` | função | Notifica um observador de forma síncrona | `src/index.ts:3` |
| `defineStatechart` | função | Valida e declara a definição da máquina | `src/index.ts:7` |
| `restoreStatechart` | função | Restaura um snapshot com validação em tempo de execução; malformado vira rejeição tipada | `src/index.ts:9` |
| `serializeStatechart` | função | Gera snapshot JSON versionado | `src/index.ts:9` |
| `STATECHART_SNAPSHOT_VERSION`, `StatechartDiagnosticCodes`, `StatechartError` | constante, enum de códigos e classe de erro | Versão do snapshot e diagnósticos | `src/index.ts:11-15` |
| Tipos (`StatechartDefinition`, `StatechartInstance`, `StatechartSnapshot`, `StatechartEvent`, `StatechartObserver`, `RestoredStatechart`, `JsonValue` e outros) | tipos | Contratos públicos | `src/index.ts:17-42` |

Exemplo real (README do pacote, `packages/statechart/README.md:130`, idêntico a `packages/statechart/fixtures/readme-quickstart.ts:1`):

```ts
import { createStatechartInstance, defineStatechart } from '@agentskit/statechart'
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | Nenhuma: `packages/statechart/package.json` só tem `devDependencies` (`:44-49`). |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/statechart.mdx` (`.doc-bridge/index.json`, `handoffs.statechart`) |
| Consumidores dentro do repo | Nenhum manifesto de pacote ou app declara `@agentskit/statechart` (busca em `packages` e `apps`, commit `9f8d8551`). Aparece na documentação (`apps/docs-next/content/docs/reference/packages/statechart.mdx`) e no fixture do próprio pacote. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Por contrato, o pacote não tem relógio oculto, aleatoriedade, I/O nem estado global mutável; o instante vem do chamador (`now`, `packages/statechart/src/statechart.ts:63`) (`CONVENTIONS.md:26`).
- Entrada e saída são somente JSON; sem acesso a arquivo, rede ou variável de ambiente (`CONVENTIONS.md:21`). Nenhuma variável de ambiente foi verificada no código.

## Como mexer (para agentes)

- **Comece por:** `packages/statechart/src/statechart.ts` (transições), `packages/statechart/src/snapshot.ts` (serialização e restauração) e `packages/statechart/CONVENTIONS.md` (regras).
- **Raiz de edição do handoff:** `packages/statechart` (`.doc-bridge/index.json`, `handoffs.statechart`).
- **Invariantes** (`packages/statechart/CONVENTIONS.md:20-29`):
  - Zero dependências de runtime.
  - Instâncias e snapshots só com dados compatíveis com JSON; clonagem JSON recusa arrays esparsos, símbolos, acessadores, números não finitos e protótipos não suportados, sem chamar getters do usuário.
  - Chaves hostis válidas, como `__proto__`, precisam ser preservadas sem mutar protótipo.
  - Restauração é uma fronteira total sobre `unknown`: entrada malformada devolve rejeição tipada e congelada.
  - Observadores são síncronos; thenables retornados são capturados e rejeitados.
  - Contrato público novo ou quebrado exige ADR.
- **Testes:** `packages/statechart/tests/statechart.test.ts` (transições e entradas hostis), `snapshot.test.ts` (serialização e restauração), `json.test.ts` (clonagem JSON), `package-manifest.test.ts` (superfície exportada).
- **Validação do pacote:** `pnpm --filter @agentskit/statechart test` (`packages/statechart/package.json:39`) e `pnpm --filter @agentskit/statechart lint` (`:41`, `tsc --noEmit`). Cobertura de linhas: pelo menos 95% (`CONVENTIONS.md:29`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas:** colocar execução de agente, retentativa ou persistência no pacote (`CONVENTIONS.md:12-14`); usar `Date.now()` ou aleatoriedade dentro da transição.
- **Quem revisa:** ADRs 0020 e 0027, por causa do beta.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0020 - Estado de interação serializável]] e [[agentskit ADR-0027 - Limites de segurança do statechart beta]].

Histórico recente (`git log --oneline -15 -- packages/statechart`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `a059cffd docs(statechart): document public API (#1779)`
- `08fce242 chore: retire public AKOS references (#1615)`

> [!info]- Detalhe técnico
> - `packages/statechart/package.json:1` — manifesto, versão, `engines` e scripts.
> - `packages/statechart/src/index.ts:1` — entrada pública.
> - `packages/statechart/src/statechart.ts:63` — `createStatechartInstance`.
> - `apps/docs-next/content/docs/for-agents/statechart.mdx:1` — handoff documental de agentes.
> - `packages/statechart/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
