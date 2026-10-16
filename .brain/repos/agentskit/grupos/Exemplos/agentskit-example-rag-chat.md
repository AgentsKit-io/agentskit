---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; pnpm indisponível, comandos não executados; auditado em 2026-10-16"
fontes:
  - "apps/example-rag-chat/package.json"
  - "apps/example-rag-chat/README.md"
  - "apps/example-rag-chat/src/App.tsx"
  - "apps/example-rag-chat/src/rag.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-rag-chat

> [!tldr] Em linguagem comum
> Chat com recuperação (RAG) sobre um pequeno corpus em Markdown. Mostra o padrão reutilizável: ingerir documentos e ligar o retriever ao `useChat`.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Chat de interface React que responde com base em documentos ingeridos (`apps/example-rag-chat/README.md:4`). A ingestão de exemplo é `ingestSampleDocs()` (`apps/example-rag-chat/src/rag.ts:131`). O componente `App` é o default export (`apps/example-rag-chat/src/App.tsx:20`) e usa `useChat({` (`:43`). O comentário em `rag.ts:12` mostra que o retriever entra direto em `useChat({ retriever: rag })`. O pacote é privado (`apps/example-rag-chat/package.json:2`).

## API e contratos

Não exporta API npm. Símbolos principais: `App` (`apps/example-rag-chat/src/App.tsx:20`) e `ingestSampleDocs` (`apps/example-rag-chat/src/rag.ts:131`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/adapters` (`apps/example-rag-chat/package.json:12`), `@agentskit/core` (`:13`), `@agentskit/rag` (`:14`) e `@agentskit/react` (`:15`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

Nenhuma variável de ambiente lida em `apps/example-rag-chat/src`. O corpus é um conjunto pequeno de Markdown, carregado pelo código de ingestão em `rag.ts`. O modelo é o adapter configurado no `App`.

## Como mexer (para agentes)

- **Comece por:** `apps/example-rag-chat/src/rag.ts` (ingestão e retriever) e `apps/example-rag-chat/src/App.tsx` (chat).
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-rag-chat lint` (`tsc --noEmit`, `apps/example-rag-chat/package.json:9`). `build` roda `tsc --noEmit && vite build` (`:8`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `vite` (`apps/example-rag-chat/package.json:7`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado. Para o contrato de recuperação, ver a nota do pacote [[agentskit-rag]].
- Histórico recente (`git log --oneline -n 3 -- apps/example-rag-chat`, conferido em 2026-10-16): `109488c8 chore: audit dead deps and align Node engines (#1783)`, `9266a6da chore(deps): refresh minor and patch versions`, `476f5b39 fix(rag): preserve optional S3 peer import (#1181)`.

> [!info]- Detalhe técnico
> - `apps/example-rag-chat/package.json:1` — manifesto, scripts (`:7` dev, `:8` build, `:9` lint) e dependências (`:12-15`).
> - `apps/example-rag-chat/src/App.tsx:20` — `App`; `:43` — `useChat`.
> - `apps/example-rag-chat/src/rag.ts:131` — `ingestSampleDocs`.
