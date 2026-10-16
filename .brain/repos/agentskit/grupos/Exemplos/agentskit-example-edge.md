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
  - "apps/example-edge/package.json"
  - "apps/example-edge/src/worker.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-edge

> [!tldr] Em linguagem comum
> Mostra uma rota de chat compatível com fetch em runtime edge.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Mostra uma rota de chat compatível com fetch em runtime edge. [apps/example-edge/src/worker.ts:40].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `fetch` — (request: Request, env: Env) => Promise<Response> [apps/example-edge/src/worker.ts:40]. Exemplo real: `async fetch(request, env) { /* handler */ }` [apps/example-edge/src/worker.ts:40].

## Quem usa e do que depende

Exercita [[agentskit-core]], [[agentskit-adapters]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-edge/package.json:1`.

## Dados e efeitos

Recebe HTTP e chama adapter; não declara persistência própria.

## Como mexer (para agentes)

- Entrada: `apps/example-edge/src/worker.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-edge lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-edge dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-edge/package.json`.
- Armadilha: O script dev é aviso/exit; use Wrangler conforme README.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-edge): 2026-07-10 · a50084ee · polimento de dependências; 2026-06-15 · 289d3ae8 · atualiza dependências; 2026-06-09 · 230dd913 · atualiza dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-edge/package.json:1`; implementação: `apps/example-edge/src/worker.ts:40`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
