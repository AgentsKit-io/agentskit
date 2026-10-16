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
  - "apps/example-ink/package.json"
  - "apps/example-ink/src/index.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-ink

> [!tldr] Em linguagem comum
> Demonstra chat no terminal com ferramenta e memória em arquivo.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra chat no terminal com ferramenta e memória em arquivo. [apps/example-ink/src/index.tsx:52].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `App` — componente Ink [apps/example-ink/src/index.tsx:52]. Exemplo real: `render(<App />)` [apps/example-ink/src/index.tsx:52].

## Quem usa e do que depende

Exercita [[agentskit-core]], [[agentskit-ink]], [[agentskit-memory]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-ink/package.json:1`.

## Dados e efeitos

Entrada/saída de terminal; `fileChatMemory` usa `.example-ink-history.json`; adapter é demonstrativo.

## Como mexer (para agentes)

- Entrada: `apps/example-ink/src/index.tsx`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-ink lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-ink dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-ink/package.json`.
- Armadilha: Não chama modelo remoto no adapter de exemplo.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-ink): 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências; 2026-06-15 · 289d3ae8 · atualiza dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-ink/package.json:1`; implementação: `apps/example-ink/src/index.tsx:52`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
