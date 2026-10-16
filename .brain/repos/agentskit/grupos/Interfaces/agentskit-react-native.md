---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/react-native"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/react-native/package.json", "packages/react-native/src/index.ts", "apps/docs-next/content/docs/for-agents/react-native.mdx", "AGENTS.md", "packages/react-native/CONVENTIONS.md", "packages/react-native/tests/components.test.tsx", "packages/react-native/tests/package-manifest.test.ts", "packages/react-native/tests/react-native.mock.tsx", "packages/react-native/tests/useChat.test.ts", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-react-native

> [!tldr] Em linguagem comum
> Pacote react-native do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/react-native` publica a superfície definida em `packages/react-native/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/react-native.mdx` e limita edições a `packages/react-native`. Fonte: `packages/react-native/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.react-native`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `useChat` | export nomeado | API pública do pacote. | `packages/react-native/src/index.ts:1` |
| `{` | export nomeado | API pública do pacote. | `packages/react-native/src/index.ts:12` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react-native'` — `packages/react-native/README.md:58`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/react-native/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/react-native.mdx` (`.doc-bridge/index.json`, `handoffs.react-native`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: EXPO_PUBLIC_ANTHROPIC_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/react-native.mdx`, `packages/react-native/CONVENTIONS.md` e `packages/react-native/src/index.ts`.
- **Raiz de edição do handoff:** `packages/react-native` (`.doc-bridge/index.json`, `handoffs.react-native`).
- **Invariantes:** Hermes lacks `TextDecoder` / Web Streams — consumers must polyfill before (`packages/react-native/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/react-native/tests/components.test.tsx`, `packages/react-native/tests/package-manifest.test.ts`, `packages/react-native/tests/react-native.mock.tsx`, `packages/react-native/tests/useChat.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/react-native test` e `pnpm --filter @agentskit/react-native lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Regras de composição e dependência]]. Histórico recente (`git log --oneline -15 -- packages/react-native`):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `1fffa79c docs(react-native): document public API (#1784)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/react-native/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/react-native/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/react-native.mdx:1` — handoff documental de agentes.
> - `packages/react-native/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
