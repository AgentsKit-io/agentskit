---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "doc-bridge index versionado em .doc-bridge/index.json (gerado em 2026-10-12) para inventário/relacionamentos; pnpm indisponível, CLI não executada; inspeção estática no commit 9b31c771"
fontes:
  - "apps/example-rag-chat/package.json"
  - "apps/example-rag-chat/src/rag.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-rag-chat

> [!tldr] Em linguagem comum
> Demonstra ingestão, embedding e retrieval de trechos em chat React.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra ingestão, embedding e retrieval de trechos em chat React. [apps/example-rag-chat/src/rag.ts:131].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `ingestSampleDocs` — (): Promise<void> [apps/example-rag-chat/src/rag.ts:131]. Exemplo real: `await ingestSampleDocs()` [apps/example-rag-chat/src/rag.ts:131].

## Quem usa e do que depende

Exercita [[agentskit-rag]], [[agentskit-react]], [[agentskit-adapters]], [[agentskit-core]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-rag-chat/package.json:1`.

## Dados e efeitos

Docs sintéticos; Transformers no navegador e store em memória; resposta pode chamar provedor remoto.

## Como mexer (para agentes)

- Entrada: `apps/example-rag-chat/src/rag.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-rag-chat lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-rag-chat dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-rag-chat/package.json`.
- Armadilha: Primeiro uso baixa modelo de embedding; provedor exige configuração própria.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-rag-chat): 2026-10-03 · 109488c8 · auditoria de dependências e engines; 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-12 · 476f5b39 · preserva import peer opcional S3.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-rag-chat/package.json:1`; implementação: `apps/example-rag-chat/src/rag.ts:131`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
